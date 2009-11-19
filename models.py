##
# Copyright 2008 Google Inc. 
# Licensed under the Apache License, Version 2.0:
# http://www.apache.org/licenses/LICENSE-2.0
##

from google.appengine.ext import db

MEMCACHE_VOTES = 'VOTES_'

def genKeyForContinentsInfo():
  return 'INFO_CONTINENTS'

def genKeyForCountriesInfo():
  return 'INFO_COUNTRIES'

def genKeyForStatesInfo(countryCode):
  return 'INFO_STATES' + countryCode

def genKeyForPostcodesInfo(countryCode):
  return 'INFO_POSTCODES' + countryCode

def genKeyForOrgsInfo(countryCode):
  return 'INFO_ORGS' + countryCode

def genKeyForTotalsInfo():
  return 'INFO_TOTALS'

class PetitionSigner(db.Model):
  type = db.StringProperty()
  gfc_id = db.StringProperty()
  name = db.StringProperty()
  email = db.StringProperty()
  org_icon = db.StringProperty()
  state = db.StringProperty()
  city = db.StringProperty()
  postcode = db.StringProperty()
  streetinfo = db.StringProperty()
  country = db.StringProperty()
  latlng = db.GeoPtProperty()
  media = db.StringProperty()
  freetext = db.StringProperty()
  host_website = db.StringProperty()

class PetitionHost(db.Model):
  host_name = db.StringProperty()
  host_email = db.StringProperty()
  host_website = db.StringProperty()
  host_bgcolor = db.StringProperty()

class Postcode(db.Model):
  postcode = db.StringProperty()
  counter = db.IntegerProperty(default=0)
  state = db.StringProperty()
  country = db.StringProperty()
  data = db.TextProperty()
  latlng = db.GeoPtProperty()

class Country(db.Model):
  country = db.StringProperty()
  counter = db.IntegerProperty(default=0)
  data = db.TextProperty()
  latlng = db.GeoPtProperty()
