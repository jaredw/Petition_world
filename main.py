import cgi
import os

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

import pages
import services
import logging

def main():
  logging.getLogger().setLevel(logging.DEBUG)
  application = webapp.WSGIApplication([
                                      ('/', pages.RootRedirect),
                                      ('/learn', pages.LearnPage),
                                      ('/vote', pages.VotePage),
                                      ('/explore', pages.ExplorePage),
                                      ('/terms', pages.TermsPage),
                                      ('/register', pages.RegisterPage),
                                      ('/embed', pages.EmbedPage),
                                      ('/debug', pages.DebugPage),
                                      ('/upload', pages.UploadPage),
                                      ('/add/random', pages.RandomAddService),
                                      ('/add/signer', pages.SignerAddService),
									  ('/add/host', pages.HostAddService),
                                      ('/nonce', services.CryptographicNonceService),
                                      ('/info/votelocal', services.VotesInLocationService),
                                      ('/info/continents', services.ContinentsInfoService),
                                      ('/info/countries', services.CountriesInfoService),
                                      ('/info/states', services.StatesInfoService),
                                      ('/info/postcodes', services.PostcodesInfoService),
                                      ('/info/orgs', services.OrgsInfoService),
                                      ('/info/totals', services.TotalsInfoService),
                                      ('/info/orgName',services.GetUniqueOrgs),
                                      ('/info/logo', services.LogoForOrg),
                                      ('/info/search', services.GetBoundedOrgs),
                                      ('/clearcache', pages.MemcacheClearer),
                                      ('/jsonimport', pages.JSONImport)
                                      ],
                                     debug=True)
  run_wsgi_app(application)

if __name__ == "__main__":
  main()
