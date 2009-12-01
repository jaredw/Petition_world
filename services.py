import cgi
import os
import logging
import copy

from google.appengine.ext import webapp
from google.appengine.api import memcache
from google.appengine.ext import db
from google.appengine.api import images

from django.utils import simplejson

import models
import util
import geodata

class CryptographicNonceService(webapp.RequestHandler):
  def get(self):
    # Don't cache this value
    self.response.headers['Content-Type'] = 'application/json; charset=utf-8'
    self.response.headers.add_header('Cache-Control', 'no-cache, must-revalidate')
    self.response.headers.add_header('Expires', 'Thu, 01 Jan 1970 08:00:00 GMT')
    # Produces 160 bits of randomness to send back to the user
    randomVal = ''.join(["%02x" % ord(x) for x in os.urandom(20)])
    # No value is required, we only need to be able to verify that we've
    # issued this nonce in the recent past.
    memcache.set(randomVal, '', 3600)
    # Spam bots generally don't maintain cookie stores
    self.response.headers.add_header(
      'Set-Cookie', 'nonce=%s; path=/' % randomVal
    )
    # Simple format string is faster than a JSON dump
    self.response.out.write("{\"nonce\": \"%s\"}" % randomVal)

class VotesInLocationService(webapp.RequestHandler):
  def get(self):
    self.response.headers.add_header('Cache-Control', 'no-cache, must-revalidate')
    self.response.headers.add_header('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT')
    country = self.request.get('country')
    state = self.request.get('state')
    city = self.request.get('city')
    postcode = self.request.get('postcode')
    query = db.Query(models.PetitionSigner)
    if country is not None and country != '':
      query.filter('country =', country)
    if state is not None and state != '':
      query.filter('state =', state)
    if city is not None and city != '':
      query.filter('city =', city)
    if postcode is not None and postcode != '':
      query.filter('postcode =', postcode)
    results = query.fetch(16) # 4 x 4 pictures
    data = []
    for result in results:
      if result.gfc_id is not None and result.gfc_id != '':
        signer = {}
        signer['gfcId'] = result.gfc_id
        data.append(signer)
    self.response.out.write(simplejson.dumps(data))

class ContinentsInfoService(webapp.RequestHandler):
  def get(self):
    self.response.headers.add_header('Cache-Control', 'no-cache, must-revalidate')
    self.response.headers.add_header('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT')
    cachedVal = memcache.get(models.genKeyForContinentsInfo())
    if cachedVal is not None:
      self.response.out.write(cachedVal)
    else:
      data = {}
      data['continents'] = copy.deepcopy(geodata.continents)
      for continentCode in geodata.continents:
        data['continents'][continentCode]['count'] = util.getContinentVotes(continentCode)
      newVal = simplejson.dumps(data)
      memcache.set(models.genKeyForContinentsInfo(), newVal, 300)
      self.response.out.write(newVal)

class CountriesInfoService(webapp.RequestHandler):
  def get(self):
    self.response.headers.add_header('Cache-Control', 'no-cache, must-revalidate')
    self.response.headers.add_header('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT')
    cachedVal = memcache.get(models.genKeyForCountriesInfo())
    if cachedVal is not None:
      self.response.out.write(cachedVal)
    else:
      data = {}
      data['countries'] = copy.deepcopy(geodata.countries)
      for countryCode in geodata.countries:
        count = util.getCountryVotes(countryCode)
        if count is 0:
          del data['countries'][countryCode]
        else:
          data['countries'][countryCode]['count'] = count
          del data['countries'][countryCode]['points']
          del data['countries'][countryCode]['levels']
          if util.countryHasStates(countryCode):
            del data['countries'][countryCode]['states']

      newVal = simplejson.dumps(data)
      memcache.set(models.genKeyForCountriesInfo(), newVal, 300)
      self.response.out.write(newVal)

class StatesInfoService(webapp.RequestHandler):
  def get(self):
    self.response.headers.add_header('Cache-Control', 'no-cache, must-revalidate')
    self.response.headers.add_header('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT')
    countryCode = self.request.get('countryCode')
    cachedVal = memcache.get(models.genKeyForStatesInfo(countryCode))
    if cachedVal is not None:
      self.response.out.write(cachedVal)
    else:
      data = {}
      data['states'] = copy.deepcopy(geodata.countries[countryCode]['states'])
      for stateCode in geodata.countries[countryCode]['states']:
        count = util.getStateVotes(countryCode, stateCode)
        if count is 0:
          del data['states'][stateCode]
        else:
          data['states'][stateCode]['count'] = count

      newVal = simplejson.dumps(data)
      memcache.set(models.genKeyForStatesInfo(countryCode), newVal, 300)
      self.response.out.write(newVal)

class PostcodesInfoService(webapp.RequestHandler):
  def get(self):
    self.response.headers.add_header('Cache-Control', 'no-cache, must-revalidate')
    self.response.headers.add_header('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT')
    countryCode = self.request.get('countryCode')
    cachedVal = memcache.get(models.genKeyForPostcodesInfo(countryCode))
    if cachedVal is not None:
      self.response.out.write(cachedVal)
    else:
      data  = {}
      results = util.getPostcodesInCountry(countryCode)
      data['postcodes'] = {}
      for result in results:
        data['postcodes'][result.postcode] = {"count": result.counter, "center": [result.latlng.lat, result.latlng.lon]}

      newVal = simplejson.dumps(data)
      memcache.set(models.genKeyForPostcodesInfo(countryCode), newVal, 10)
      self.response.out.write(newVal)

class OrgsInfoService(webapp.RequestHandler):
  def get(self):
    self.response.headers.add_header('Cache-Control', 'no-cache, must-revalidate')
    self.response.headers.add_header('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT')
    countryCode = self.request.get('countryCode')
    cachedVal = memcache.get(models.genKeyForOrgsInfo(countryCode))
    if cachedVal is not None:
      self.response.out.write(cachedVal)
    else:
      data  = {}
      results = util.getOrgsInCountry(countryCode)
      data['orgs'] = []
      for result in results:
        data['orgs'].append({"name": result.name, "center": [result.latlng.lat, result.latlng.lon], "freetext": result.freetext, "media": result.media, "icon": result.org_icon});

      newVal = simplejson.dumps(data)
      memcache.set(models.genKeyForOrgsInfo(countryCode), newVal, 10)
      self.response.out.write(newVal)

class TotalsInfoService(webapp.RequestHandler):
  def get(self):
    self.response.headers.add_header('Cache-Control', 'no-cache, must-revalidate')
    self.response.headers.add_header('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT')
    cachedVal = memcache.get(models.genKeyForTotalsInfo())
    if cachedVal is not None:
      logging.info("Memcache hit: %s" % (cachedVal))
      self.response.out.write(cachedVal)
    else:
      data  = {}
      totalVotes, totalCountries, totalOrgs = util.getTotals()
      data['total'] = {'totalVotes': totalVotes, 'totalCountries': totalCountries, 'totalOrgs': totalOrgs}
      newVal = simplejson.dumps(data)
      memcache.set(models.genKeyForTotalsInfo(), newVal, 30)
      self.response.out.write(newVal)


class GetBoundedOrgs(webapp.RequestHandler):
  def get(self):
    self.response.headers.add_header('Cache-Control', 'no-cache, must-revalidate')
    self.response.headers.add_header('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT')
    countryCodes = self.request.get('countryCode').split('|')
    name = self.request.get('name')
    bounds = self.request.get('bounds')
 
    


#get logos
class LogoForOrg(webapp.RequestHandler):
  #TODO: store resized images some where
  def get(self):
     orgName = self.request.get('orgName')
     logging.info(orgName)
     query = db.Query(models.PetitionSigner)
     #result = query.filter('ID =',db.key(orgID)).get()
     result = query.filter('name =',orgName).get()
     if result is not None:
       if result.org_icon_hosted is not None:
          self.response.headers['Content-Type'] = "image/png"
          image = images.resize(result.org_icon_hosted,32,32)
          self.response.out.write(image)
     
    