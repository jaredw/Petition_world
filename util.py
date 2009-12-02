import cgi
import os
import logging
import re

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import template
from google.appengine.ext import db
from google.appengine.api import memcache
from google.appengine.api import mail

from django.utils import simplejson

import models
import geocoder
import geodata 

def sendEmbedMail(to, bgColor, website):
  message = mail.EmailMessage(
    sender="Show Your Vote <admin@showyourvote.org>",
    subject="Embed code for Show Your Vote"
  )
  normalizedBgColor = re.sub("#", "", bgColor.lower())
  embedURL = (
    "http://www.showyourvote.org/vote" +
    "?skin=mini&amp;bg_color=%s&amp;website=%s"
  ) % (normalizedBgColor, website)
  message.to = to
  message.body = """
You can embed the Show Your Vote petition in your site with the
following code:

<iframe src="%s"
  frameborder="0" width="625" height="510">
  <p>Your browser does not support iframes.</p>
</iframe>
  """ % embedURL
  logging.info(bgColor)
  logging.info(normalizedBgColor)
  message.send()

def addSignerToClusters(signer, extraLatLng):
  # Put signer in PetitionSigner datastore
  signer.put()

  clusterdata = {'lastname': signer.name,
                 'city': signer.city,
                 'state': signer.state,
                 'country': signer.country,
                 'postcode': signer.postcode,
                 'lat': signer.latlng.lat,
                 'lng': signer.latlng.lon}

  countryCode = signer.country
  stateCode = signer.state
  postcode = signer.postcode
  memcache.delete(models.MEMCACHE_VOTES + countryCode)
  memcache.delete(models.MEMCACHE_VOTES + countryCode + postcode)
  memcache.delete(models.MEMCACHE_VOTES + countryCode + stateCode)

  if not countryHasPostcodes(countryCode):
    query = db.Query(models.Country)
    query.filter('country =', countryCode)
    result = query.get()
    if result is None:
      countryCounter = models.Country()
      countryCounter.country = countryCode
      countryCounter.counter = 1
      countryCounter.data = simplejson.dumps([clusterdata])
      countryCounter.put()
    else:
      countryCounter = result
      countryCounter.counter = countryCounter.counter + 1
      data = simplejson.loads(countryCounter.data)
      data.append(clusterdata)
      countryCounter.data = simplejson.dumps(data)
      countryCounter.put()
  else:
    query = db.Query(models.Postcode)
    query.filter('country =', countryCode)
    query.filter('postcode =', postcode)
    result = query.get()
    if result is None:
      postcodecluster = models.Postcode()
      postcodecluster.postcode = postcode
      postcodecluster.state = stateCode
      postcodecluster.country = countryCode
      postcodecluster.data = simplejson.dumps([clusterdata])
      postcodecluster.counter = 1
      postcodecluster.latlng = extraLatLng
      postcodecluster.put()
    else:
      postcodecluster = result
      postcodecluster.counter = postcodecluster.counter + 1
      data = simplejson.loads(postcodecluster.data)
      data.append(clusterdata)
      postcodecluster.data = simplejson.dumps(data)
      postcodecluster.put()

def countryHasPostcodes(countryCode):
  if countryCode and geodata.countries.get(countryCode):
    return geodata.countries[countryCode].get('postcode') >= 0
  elif countryCode:
    logging.warn("Country code does not exist: %s" % countryCode)
    return False
  else:
    return False

def countryHasStates(countryCode):
  if countryCode and geodata.countries.get(countryCode):
    return geodata.countries[countryCode].has_key('states')
  elif countryCode:
    logging.warn("Country code does not exist: %s" % countryCode)
    return False
  else:
    return False

def getCountryVotesInStore(countryCode):
  query = db.Query(models.Country)
  query.filter('country =', countryCode)
  result = query.get()
  if result:
    return result.counter
  else:
    return -1

def getCountryVotesPerStateInStore(countryCode):
  numVotesInCountry = 0
  for stateCode in geodata.countries[countryCode]['states']:
    votesMemcache = memcache.get(models.MEMCACHE_VOTES + countryCode + stateCode)
    if votesMemcache is not None:
      logging.info("Memcache hit: " + countryCode + stateCode)
      numVotesInCountry += int(votesMemcache)
    else:
      logging.info("Memcache miss: " + countryCode + stateCode)
      # get all the postcodes for that state
      # 10 states have more than 1,000 - 3 have more than 2,000
      # We will have to re-fetch max of 2 times
      query = db.Query(models.Postcode)
      query.filter('country =', countryCode)
      query.filter('state =', stateCode)
      results = query.fetch(1000)
      numVotesInState = 0
      for result in results:
        numVotesInState += result.counter
      memcache.set(models.MEMCACHE_VOTES + countryCode + stateCode, str(numVotesInState))
      numVotesInCountry += numVotesInState
  return numVotesInCountry

def getCountryVotesPerPostcodeInStore(countryCode):
  numVotesInCountry = 0
  results = getPostcodesInCountry(countryCode)
  for result in results:
    numVotesInCountry += result.counter
  return numVotesInCountry

def getStateVotesInStore(countryCode, stateCode):
  numVotesInState = 0
  # this relies on there being less than 1000 postcodes in a state
  # there are 4 states that violate this, max is 2600
  # todo: account for those 4 states
  query = db.Query(models.Postcode)
  query.filter('country =', countryCode)
  query.filter('state =', stateCode)
  results = query.fetch(1000)
  for result in results:
    numVotesInState += result.counter
  return numVotesInState

def getTotals():
  # keep this memcached as much as possible
  # perhaps only re-calculate every 5 minutes?
  orgsMemcache = memcache.get('ORGS_TOTAL')
  if orgsMemcache is None:
    numOrgs = getTotalOrgs()
    memcache.set('ORGS_TOTAL', str(numOrgs), 300)
  else:
    numOrgs = int(orgsMemcache)

  votesMemcache = memcache.get(models.MEMCACHE_VOTES + 'TOTAL')
  countriesMemcache = memcache.get(models.MEMCACHE_VOTES + 'COUNTRIES')
  if votesMemcache is not None and countriesMemcache is not None:
    logging.info("Memcache total hit: votes: %s countries: %s Orgs: %s" % (votesMemcache, countriesMemcache,numOrgs))
    return int(votesMemcache), int(countriesMemcache), numOrgs
  else:
    numVotesTotal = 0
    numCountries = 0
    for countryCode in geodata.countries:
      numVotesInCountry = getCountryVotes(countryCode)
      if numVotesInCountry > 0:
        numCountries += 1
        numVotesTotal += numVotesInCountry

    memcache.set(models.MEMCACHE_VOTES + 'TOTAL', str(numVotesTotal), time=300)
    memcache.set(models.MEMCACHE_VOTES + 'COUNTRIES', str(numCountries), time=300)
    logging.info("Memcache total miss: votes: %s countries: %s Orgs: %s" % (numVotesTotal, numCountries,numOrgs))
    return numVotesTotal, numCountries, numOrgs

def getContinentVotes(continentCode):
  votesMemcache = memcache.get(models.MEMCACHE_VOTES + 'CONT_' + continentCode)
  if votesMemcache is not None:
    return int(votesMemcache)
  else:
    numVotesTotal = 0
    for countryCode in geodata.continents[continentCode]["countries"]:
      numVotesTotal += getCountryVotes(countryCode)
    memcache.set(models.MEMCACHE_VOTES + 'CONT_' + continentCode, str(numVotesTotal), 300)
    return numVotesTotal

def getCountryVotes(countryCode):
  votesMemcache = memcache.get(models.MEMCACHE_VOTES + countryCode)
  if votesMemcache is not None:
    return int(votesMemcache)
  elif not countryHasPostcodes(countryCode) and not countryHasStates(countryCode):
    votesInCountry = getCountryVotesInStore(countryCode)
  elif countryHasStates(countryCode):
    votesInCountry = getCountryVotesPerStateInStore(countryCode)
  elif countryHasPostcodes(countryCode):
    votesInCountry = getCountryVotesPerPostcodeInStore(countryCode)

  memcache.set(models.MEMCACHE_VOTES + countryCode, str(votesInCountry))
  return votesInCountry


def getStateVotes(countryCode, stateCode):
  votesMemcache = memcache.get(models.MEMCACHE_VOTES + countryCode + stateCode)
  if votesMemcache is not None:
    return int(votesMemcache)
  else:
    numVotesInState = getStateVotesInStore(countryCode, stateCode)
    memcache.set(models.MEMCACHE_VOTES + countryCode + stateCode, str(numVotesInState))
    return numVotesInState


def getPostcodeVotes(countryCode, postcode):
  votesMemcache = memcache.get(models.MEMCACHE_VOTES + countryCode + postcode)
  if votesMemcache is not None:
    return int(votesMemcache)
  else:
    numVotesInPostcode = getPostcodeVotesInStore()
    memcache.set(models.MEMCACHE_VOTES + countryCode + postcode, str(numVotesInPostcode))
    return numVotesInPostcode

def getPostcodesInCountry(countryCode):
  query = db.Query(models.Postcode)
  query.filter('country =', countryCode)
  # todo: account for some countries having more than 1000 postcodes
  results = query.fetch(1000)
  return results

def getOrgsInCountry(countryCode):
  query = db.Query(models.PetitionSigner)
  query.filter('country = ', countryCode)
  query.filter('type = ', 'org')
  results = query.fetch(1000)
  return results


def getUniqueWithCount(elements,keyFunc=None,storeFunc=None):
  results = {}
  if keyFunc is None:
      keyFunc = lambda x: x
  if storeFunc is None:
     storeFunc = lambda x: x
  for elem in elements:
      marker = keyFunc(elem)
      if marker not in results:
          results[marker] = {}
          results[marker]['item'] = storeFunc(elem)
          results[marker]['count'] = 1
      else:
          results[marker]['count'] += 1
  return results
  
  
def getUnique(elements,keyFunc=None):
  results = []
  uniq = {}
  if keyFunc is None:
      keyFunc = lambda x: x
  for elem in elements:
      marker = keyFunc(elem)
      if marker not in uniq:
        uniq[marker] = 1
        results.append(elem)
      
  return results

def getOrgsInCountryForName(countryCode,name):
    orgs = memcache.get(models.MEMCACHE_VOTES + countryCode + name)
    if orgs is not None:
      return orgs
    else:
        query = db.Query(models.PetitionSigner)
        query.filter('country = ', countryCode)
        query.filter('type = ', 'org')
        query.filter('name = ', name)
        #have to query few times around if these ever exceed 1000
        results = query.fetch(1000)
        memcache.set(models.MEMCACHE_VOTES + countryCode + name,results)
        return results



def getOrgsForName(name):
    orgs = memcache.get(models.MEMCACHE_VOTES  + name)
    if orgs is not None:
      return orgs
    else:
        query = db.Query(models.PetitionSigner)
        
        query.filter('country = ', countryCode)
        query.filter('type = ', 'org')
        query.filter('name = ', name)
        #have to query few times around if these ever exceed 1000
        results = query.fetch(1000)
        memcache.set(models.MEMCACHE_VOTES + countryCode + name,results)
        return results



def getTotalOrgs():
  query = db.Query(models.PetitionSigner)
  query.filter('type = ', 'org')
  return len(list(query._get_query()._Run(prefetch_count=1000, next_count=1000, limit=10000)))
