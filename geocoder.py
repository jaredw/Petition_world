from google.appengine.api import urlfetch
from google.appengine.ext import db
import urllib

def geocodeAddress(address):
  basePath = 'http://maps.google.com/maps/geo?output=csv&sensor=false&key=ABQIAAAAndLQTfJ9k_JvMh7lbOFC1RS4My7l3P1CJ6Hnc875WZoO7BnwWBT9WQb3OhuPByEjaQs33G5wM5s5Ng&q='
  enc_address = urllib.quote_plus(address)
  response = urlfetch.fetch(basePath + enc_address)
  if response.status_code == 200:
    [lat, lng] = [float(x) for x in response.content.split(',')[2:4]]
    return db.GeoPt(lat, lng)
  return None
