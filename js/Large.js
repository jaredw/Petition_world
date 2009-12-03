google.load("search", "1.0")
google.load("earth", "1");
google.load('friendconnect', '0.8');

var nonce;
var geocodeInProgress;
var visitorId = null;
var visitorName = null;
var locationId = "global";
var voteMap;
var toggler = 0;
var maxZoomSeen = 0;
var countries;
var orgs;
var searchedOrgs;
var loadedCountries = false;
var loadedContinents = false;
var markerManager;
var markerManagerSearch;



if (site_bg_color == "" || site_bg_color == null) {
  switch(site_skin) {
  case "mini":
    site_bg_color = "#fdf7eb"
    break;
  case "main":
  default:
    site_bg_color = "#f2f2f2";
  }
}


function getParameterByName(name) {
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.href);
  if (results == null) {
    return "";
  } else {
    return results[1];
  }
}


function cmxform() {
  // Hide forms
  jQuery('form.cmxform').hide().end();
  // Processing
  jQuery('form.cmxform').find('li label').not('.nocmx').each(function(i) {
    var labelContent = this.innerHTML;
    var labelWidth = document.defaultView.getComputedStyle(this, '').getPropertyValue('width');
    var labelSpan = document.createElement('span');
    labelSpan.style.display = 'block';
    labelSpan.style.width = labelWidth;
    labelSpan.innerHTML = labelContent;
    this.style.display = '-moz-inline-box';
    this.innerHTML = null;
    this.appendChild(labelSpan);
  }).end();

  // Show forms
  jQuery('form.cmxform').show().end();
}




function performFormsGeoCode() {
  var country = jQuery('#country').val();
  if (country != null && country.replace(/^\s+|\s+$/g, '') != '') {
    // They've set their country, we can geocode something.
    // TODO: Do fewer geocodes.
    setTimeout(function () {
      var streetinfo = jQuery('#streetinfo').val();
      var state = jQuery('#state').val();
      var city = jQuery('#city').val();
      var postcode = jQuery('#postcode').val();
      var geocoder = new GClientGeocoder();
      var locationString;
      locationString = streetinfo + ", " + city + ", " + state + " " + postcode + ", " + country;
      if (!geocodeInProgress || locationString != geocodeInProgress) {
        geocoder.getLatLng(locationString, latLngHandler);
        geocodeInProgress = locationString;
      }
    }, 100);
  }
}

function loadNonce() {
  if (!nonce) {
    jQuery.getJSON('/nonce', function (data) {
      nonce = data['nonce'];
      jQuery('#nonce').val(SHA1(nonce));
    })
  }
}

function handleSubmit()
{
  $("#vote").hide();
  jQuery('#lng').val();
  var point = new GLatLng(jQuery('#lat').val(),jQuery('#lng').val());
      voteMap.setCenter(point, 8);
}

jQuery(document).ready(function() {
  

  jQuery('#show_your_vote').tabs('option', 'selected', 1);
  loadNonce();
  jQuery('.org').hide();
  jQuery('#sign').validate();

  initVoteMap();
  initExploreMap(voteMap);
  initSearch();
  $("sign").click(handleSubmit);
  window.setInterval(animateTotals, 4000);
  google.friendconnect.container.setParentUrl('/gfc/');
  
  if (geo_position_js.init()) {
    geo_position_js.getCurrentPosition(geoSuccess, geoError);
  } else {
    geoError();
  }

  // Do a geocode for any events that might fire if the form has changed.
  jQuery('#country').change(performFormsGeoCode);
  jQuery('#state').change(performFormsGeoCode);
  jQuery('#city').change(performFormsGeoCode);
  jQuery('#postcode').change(performFormsGeoCode);
  jQuery('#streetinfo').change(performFormsGeoCode);
  jQuery('#city').keypress(performFormsGeoCode);
  jQuery('#postcode').keypress(performFormsGeoCode);

  populateCountries();
});

function initVoteMap() {
  voteMap = new GMap2(jQuery("#vote_map")[0]);

    
  //ensures this loads when the vote is submitted  
  var latlng = jQuery.cookie('latlng');
  if (latlng) {
    var point = new GLatLng(latlng.split(',')[0], latlng.split(',')[1]);
      voteMap.setCenter(point, 8);
  }
  else
  {
      voteMap.setCenter(new GLatLng(0,180), 0);
  }
  voteMap.setUIToDefault();
}

function populateCountries() {
  jQuery('.state').hide();
  var countrySelect = jQuery('#country');
  countrySelect.change(populateStates);
  for (var countryCode in countriesInfo) {
    var countryOption = jQuery(document.createElement('option'));
    countryOption.val(countryCode);
    countryOption.text(countriesInfo[countryCode].name);
    countrySelect.append(countryOption);
  }
}

function populateStates() {
  var countryCode = jQuery('#country').val();
  if (countriesInfo[countryCode].hasStates) {
    jQuery('.state').show();
    var states = countriesInfo[countryCode].states;
    jQuery('#state').rules('add', {required: true});
    jQuery('#state').html('');
    for (var i = 0; i < states.length; i++) {
      var stateOption = jQuery(document.createElement('option'));
      stateOption.val(states[i]);
      stateOption.text(states[i]);
      jQuery('#state').append(stateOption);
    }
  } else {
    jQuery('.state').hide();
    jQuery('#state').rules('remove');
  }

  var postcodeInput = jQuery('#postcode');
  if (countriesInfo[countryCode].hasPostcodes) {
    jQuery('.postcode').show();
    jQuery('#postcode').rules('add', {required: true});
  } else {
    jQuery('.postcode').hide();
    jQuery('#postcode').rules('remove');
  }
}

function geoSuccess(p) {
  // We have a lat/lon point, do a reverse lookup
  var point = new GLatLng(p.coords.latitude, p.coords.longitude);
  var geocoder = new GClientGeocoder();
  geocoder.getLocations(point, addressHandler);
}

function locationString(country, state, city, postcode) {
  if (state) {
    return city + ", " + state + " " + postcode + ", " + country;
  } else {
    return city + ", " + postcode + ", " + country;
  }
}

function addressHandler(response) {
  if (!response || response.Status.code != 200) {
    geoError();
  } else {
    var place = response.Placemark[0];
    var country = place.AddressDetails.Country.CountryNameCode;
    var state = place.AddressDetails.Country.AdministrativeArea.AdministrativeAreaName;
    // Sometimes Maps gives us an AdministrativeArea, and sometimes it gives a SubAdministrativeArea
    if (place.AddressDetails.Country.AdministrativeArea.Locality) {
      var city = place.AddressDetails.Country.AdministrativeArea.Locality.LocalityName;
      var postcode = place.AddressDetails.Country.AdministrativeArea.Locality.PostalCode.PostalCodeNumber;
    } else if (place.AddressDetails.Country.AdministrativeArea.SubAdministrativeArea.Locality) {
      var city = place.AddressDetails.Country.AdministrativeArea.SubAdministrativeArea.Locality.LocalityName;
      var postcode = place.AddressDetails.Country.AdministrativeArea.SubAdministrativeArea.Locality.PostalCode.PostalCodeNumber;
    } else {
      return geoError();
    }
    jQuery('#country').val(country).change();
    jQuery('#state').val(state);
    jQuery('#city').val(city);
    jQuery('#postcode').val(postcode);
    var geocoder = new GClientGeocoder();
    geocoder.getLatLng(locationString(country, state, city, postcode), latLngHandler);
  }
}

function latLngHandler(point) {
  if (!point) {
    geoError();
  } else {
    if (!voteMap) {
      initVoteMap();
    }
    voteMap.clearOverlays();
    voteMap.setCenter(point, 11);
    var marker = new GMarker(point);
    voteMap.addOverlay(marker);
    jQuery('#lat').val(point.lat());
    jQuery('#lng').val(point.lng());
    jQuery('#submit').removeAttr('disabled');
  }
}

function geoError() {
  // jQuery('.loc').show();
}

function toggleForm(formValue) {
  if (formValue == 'org') {
    jQuery('#email').rules('add', {required: true});
    jQuery('#streetinfo').rules('add', {required: true});
    jQuery('#org_name').rules('add', {required: true});
    jQuery('#person_name').rules('remove');
    jQuery('.person').hide();
    jQuery('.org').show();
  } else {
    jQuery('.org').hide();
    jQuery('#email').rules('remove');
    jQuery('#streetinfo').rules('remove');
    jQuery('#org_name').rules('remove');
    jQuery('#person_name').rules('add', {required: false});
    jQuery('.person').show();
  }
}




/*duplicated from explore.js if time permits we should really move this into a class that takes a map instance as a dep */

function initSearch() {
  jQuery.getJSON("/info/orgName", function(data,text)
  {
     orgs = data; 
  });
  jQuery("#searchButton").click(searchnNearOrgs);
}






function createOrgIcon(url) {
  var opts = {};
  opts.useImg = true;
  opts.image = url;
  opts.size = new GSize(32, 32);
  return opts;
}

function createMedOrgIcon(url) {
  var opts = {}
  opts.useImg = true;
  opts.image = url;
  opts.size = new GSize(16, 16);
  return opts;
}

function createSmallOrgIcon(url) {F
  var opts = {}
  opts.useImg = true;
  opts.image = url;
  opts.size = new GSize(6, 6);
  return opts;
}

function createBigIcon(label) {
  var iconOptions = {};
  iconOptions.size = new GSize(64, 26);
  iconOptions.backgroundColor = "#ca6618";
  iconOptions.label = "" + label;
  return iconOptions;
}

function createMediumIcon(label) {
  var iconOptions = {};
  iconOptions.size = new GSize(48, 22);
  iconOptions.backgroundColor =  "#0097c4";
  iconOptions.label = "" + label;
  return iconOptions;
}

function createSmallIcon(label) {
  var iconOptions = {};
  iconOptions.size = new GSize(24, 18);
  iconOptions.backgroundColor = "#85a20a";
  iconOptions.label = "" + label;
  return iconOptions;
}

function createOrgMarkerWithCount(info) {
   
  if(info.icon.length == 0)
  {
    //default image for orgs with no image attached to them
    info.icon = 'http://www.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png';
  }
  
  if(!info.icon.match(/http/i))
  {
    info.icon = document.location.protocol + '//' +
              document.location.host + "/" + info.icon;
  }
  

    
  var marker = new MarkerLight(new GLatLng(info.center[0], info.center[1]), createOrgIcon(info.icon));
  GEvent.addListener(marker, "click", function() {
    voteMap.openInfoWindowHtml(marker.getPoint(), "<b>" + info.name + "</b><br />Total Votes: " + info.count, {pixelOffset: new GSize(16, -16)});
  });
  return marker;
}


function createOrgMarker(info) {
  var marker = new MarkerLight(new GLatLng(info.center[0], info.center[1]), createOrgIcon(info.icon));
  GEvent.addListener(marker, "click", function() {
    voteMap.openInfoWindowHtml(marker.getPoint(), "<b>" + info.name + "</b>", {pixelOffset: new GSize(16, -16)});
  });
  return marker;
}

function createMedOrgMarker(info) {
  var marker = new MarkerLight(new GLatLng(info.center[0], info.center[1]), createMedOrgIcon(info.icon));
  GEvent.addListener(marker, "click", function() {
    voteMap.openInfoWindowHtml(marker.getPoint(), "<b>" + info.name + "</b>", {pixelOffset: new GSize(8,-8)});
  });
  return marker;
}

function createSmallOrgMarker(info) {
  var marker = new MarkerLight(new GLatLng(info.center[0], info.center[1]), createSmallOrgIcon(info.icon));
  GEvent.addListener(marker, "click", function() {
    voteMap.openInfoWindowHtml(marker.getPoint(), "<b>" + info.name + "</b>", {pixelOffset: new GSize(4, -4)});
  });
  return marker;
}

function createMarker(markerType, locationCode, latlng, icon, title, zoom) {
  var voteLocation = getParameterByName("location");
  var infoWindowOptions = function () {
    var commentsWidth = 441;
    if (site_skin == "mini") {
      commentsWidth = 338;
    }
    return {
      maxTitle: title,
      maxContent: '\
<div class="map_comments">\
  <div id="div-864264044956702366" style="width:' + commentsWidth + 'px;border:1px solid #cccccc;max-height:336px"></div>\
</div>\
'
    }
  }
  var marker = new MarkerLight(latlng, icon);
  marker.markerType = markerType;
  marker.locationCode = locationCode;
  marker.title = title;

  var tooltip = new MapTooltip(latlng, title, {offsetX: icon.size.width + 6});
  GEvent.addListener(marker, "mouseover", function() {
    voteMap.addOverlay(tooltip);
  });
  GEvent.addListener(marker, "mouseout", function() {
    voteMap.removeOverlay(tooltip);
  });
  if (markerType != "continent") {
    var createInfoWindow = function() {
      currentMarker = marker;
      jQuery.getJSON("/info/votelocal?" + markerType + "=" + locationCode, function (gfcSigners) {
        if (gfcSigners.length == 0) {
          voteMap.openInfoWindowHtml(latlng,
            '<p>' +
              icon.label + ' signed the petition here.' +
            '</p>',
            infoWindowOptions()
          );
          return;
        }
        var gfcIds = [];
        for (var i = 0; i < gfcSigners.length; i++) {
          gfcIds.push(gfcSigners[i]['gfcId']);
        }
        var params = {};
        params[opensocial.DataRequest.PeopleRequestFields.PROFILE_DETAILS] = [opensocial.Person.Field.PROFILE_URL];
        var openSocialReq = opensocial.newDataRequest();
        var idSpec = opensocial.newIdSpec({'userId': gfcIds});
        openSocialReq.add(openSocialReq.newFetchPeopleRequest(idSpec, params), 'signers');
        openSocialReq.send(function (data) {
          if (!data.hadError()) {
            var signers = data.get('signers').getData();
            var gfcImageList = '';
            gfcImageList = gfcImageList + '<ul class="picture_set">';
            signers.each(function(signer) {
              if (signer.getField(opensocial.Person.Field.PROFILE_URL)) {
                gfcImageList = gfcImageList +
                  '<li><a href="' +
                    signer.getField(opensocial.Person.Field.PROFILE_URL) +
                  '"><img src="' +
                    signer.getField(opensocial.Person.Field.THUMBNAIL_URL) +
                  '" alt="' + signer.getDisplayName() + '" /></a></li>';
              } else {
                gfcImageList = gfcImageList +
                  '<li><img src="' +
                    signer.getField(opensocial.Person.Field.THUMBNAIL_URL) +
                  '" alt="' + signer.getDisplayName() + '" /></li>';
              }
            });
            gfcImageList = gfcImageList + '</ul>';
            voteMap.openInfoWindowHtml(latlng,
              gfcImageList +
              '<p>' +
                icon.label + ' signed the petition here.' +
              '</p>' +
              '<p>' +
              '<a href="javascript:voteMap.getInfoWindow().maximize()">Discuss</a>' +
              '</p>',
              infoWindowOptions()
            );
          } else {
            alert(data.getErrorMessage());
          }
        });
      });
    };
    GEvent.addListener(marker, "click", createInfoWindow);
    if (voteLocation == locationCode) {
      jQuery(window).load(function() {
        // Open this marker immediately if this is where the voter is
        // For the sake of GFC, needs to be in onload
         
        createInfoWindow();
      });
    }
  }
  return marker;
}



function animateTotals() {
  if (toggler == 0) {
  jQuery('#votes_span').toggle();  //toggle off
  jQuery('#countries_span').toggle(); //toggle on
  toggler = 1;
  }
  else if (toggler == 1) {
  jQuery('#countries_span').toggle(); //toggle off
  jQuery('#orgs_span').toggle(); // toggle on
  toggler = 2;
  }
  else if (toggler == 2) {
  jQuery('#orgs_span').toggle(); //toggle off
  jQuery('#votes_span').toggle();  //toggle on
  toggler = 0;
  }
}



function processContinents(json) {
  var info = json;
  var markers = [];
  for (continentCode in info.continents) {
    var continent = info.continents[continentCode];
    if (continent.count == 0) continue;
    var marker = createMarker("continent", continentCode, new GLatLng(continent.center[0], continent.center[1]), createBigIcon(continent.count), continent.name, 3);
    markers.push(marker);
  }
  markerManager.addMarkers(markers, 0, 3);
  markerManager.refresh();
}

function processCountries(json) {
  var info = json;
  var markers = [];
  for (countryCode in info.countries) {
    var country = info.countries[countryCode];
    var marker = createMarker("country", countryCode, new GLatLng(country.center[0], country.center[1]), createBigIcon(country.count), country.name, 6);
    markers.push(marker);
  }
  markerManager.addMarkers(markers, 4, 7);
  markerManager.refresh();
}

function processStates(json) {
  var info = json;
  var markers = [];
  for (stateCode in info.states) {
    var state = info.states[stateCode];
    var marker = createMarker("state", stateCode, new GLatLng(state.center[0], state.center[1]), createMediumIcon(state.count), state.name, 6);
    markers.push(marker);
  }

  markerManager.addMarkers(markers, 4, 7);
  markerManager.refresh();
}

function processPostcodes(json) {
  var info = json;
  var markers = [];
  for (postcodeCode in info.postcodes) {
    var postcode = info.postcodes[postcodeCode];
    var marker = createMarker("postcode", postcodeCode, new GLatLng(postcode.center[0], postcode.center[1]), createSmallIcon(postcode.count), postcodeCode, 14);
    markers.push(marker);
  }

  markerManager.addMarkers(markers, 8);
  markerManager.refresh();
}

function processOrgs(json) {
  var orgs = json.orgs;
  var markers = [];

/*
  for (var i = 0; i < orgs.length; i++) {
      var marker = createSmallOrgMarker(orgs[i]);
      markers.push(marker);
    }
    markerManager.addMarkers(markers, 5, 8); // 0 is the coarsest setting, full world view
  */
 markers = [];
 for (var i = 0; i < orgs.length; i++) {
   if (orgs[i].icon.length > 20) {
     var marker = createMedOrgMarker(orgs[i]);
     markers.push(marker);
   }
 }
 markerManager.addMarkers(markers, 10, 13); // 0 is the coarsest setting, full world view

 markers = [];
 for (var i = 0; i < orgs.length; i++) {
   if (orgs[i].icon.length > 20) {
     var marker = createOrgMarker(orgs[i]);
     markers.push(marker);
   }
  }
  markerManager.addMarkers(markers, 14); // 0 is the coarsest setting, full world view

  markerManager.refresh();
}


function handleZoomChange() {    
 if (voteMap.getZoom() > 2 && voteMap.getZoom() < 6 && !loadedCountries) {
   jQuery.getJSON("/info/countries", processCountries);
   loadedCountries = true;
 }
 if (voteMap.getZoom() >= 0 && voteMap.getZoom() < 4 && !loadedContinents) {
   jQuery.getJSON("/info/continents", processContinents);
   loadedContinents = true;
 }
}


function handleBoundsChange() {
 
  var bounds = voteMap.getBounds();
  for (countryCode in countriesInfo) {
    var countryInfo = countriesInfo[countryCode];
    var countryBounds = new GLatLngBounds(new GLatLng(countryInfo.bounds.southWest[0], countryInfo.bounds.southWest[1]), new GLatLng(countryInfo.bounds.northEast[0], countryInfo.bounds.northEast[1]));
    if (bounds.intersects(countryBounds)) {
      if (!countryInfo.hasStates
       && !countryInfo.loadedPostcodes
       && voteMap.getZoom() > 4) {
        jQuery.getJSON("/info/postcodes?countryCode=" + countryCode, processPostcodes);
        jQuery.getJSON("/info/orgs?countryCode=" + countryCode, processOrgs);
        countryInfo.loadedPostcodes = true;
      }
      if ( countryInfo.hasStates
       && !countryInfo.loadedStates
       && voteMap.getZoom() > 2) {
        jQuery.getJSON("/info/states?countryCode=" + countryCode, processStates);
        countryInfo.loadedStates = true;
      }
      if ( countryInfo.hasStates
       && !countryInfo.loadedPostcodes
       && voteMap.getZoom() > 4) {
        jQuery.getJSON("/info/postcodes?countryCode=" + countryCode, processPostcodes);
        jQuery.getJSON("/info/orgs?countryCode=" + countryCode, processOrgs);
        countryInfo.loadedPostcodes = true;
      }
    }
  }
}



function initExploreMap(exploreMap) {
 

  markerManager = new MarkerManager(exploreMap);
  markerManagerSearch = new MarkerManager(exploreMap);
  GEvent.addListener(exploreMap, "zoomend", handleZoomChange);
  GEvent.addListener(exploreMap, "moveend", handleBoundsChange);
  handleZoomChange();
  handleBoundsChange();
  jQuery.getJSON("/info/totals", processTotals);
    
  GEvent.addListener(exploreMap, "infowindowopen", function() {
    var iw = exploreMap.getInfoWindow();
    window.setTimeout(function () {
      iw.maximize();
    }, 5);


    GEvent.addListener(iw, "maximizeend", function() {
      var skin = {};
      skin['BORDER_COLOR'] = '#cccccc';
      skin['ENDCAP_BG_COLOR'] = site_bg_color;
      skin['ENDCAP_TEXT_COLOR'] = '#333333';
      skin['ENDCAP_LINK_COLOR'] = '#0000cc';
      skin['ALTERNATE_BG_COLOR'] = '#ffffff';
      skin['CONTENT_BG_COLOR'] = '#ffffff';
      skin['CONTENT_LINK_COLOR'] = '#0000cc';
      skin['CONTENT_TEXT_COLOR'] = '#333333';
      skin['CONTENT_SECONDARY_LINK_COLOR'] = '#7777cc';
      skin['CONTENT_SECONDARY_TEXT_COLOR'] = '#666666';
      skin['CONTENT_HEADLINE_COLOR'] = '#333333';
      skin['DEFAULT_COMMENT_TEXT'] = '- add your comment here -';
      skin['HEADER_TEXT'] = 'Show your support of the vote in ' + currentMarker.title;
      skin['POSTS_PER_PAGE'] = '4';
      skin['HEIGHT'] = '330';
      google.friendconnect.container.renderWallGadget({
            id: 'div-864264044956702366',
            site: site_id,
            'view-params': {
              "disableMinMax": "true",
              "scope": "ID",
              "features": "video,comment",
              "allowAnonymousPost":"true",
              "docId": SHA1(currentMarker.markerType + currentMarker.locationCode + currentMarker.title),
              "startMaximized": "true",
              "useFixedHeight": "true"
            }
          }, skin);
      });
   });  
}

function processTotals(json) {
  jQuery("#votes").html(json.total.totalVotes);
  jQuery("#countries").html(json.total.totalCountries);
  jQuery("#orgs").html(json.total.totalOrgs);
}

function searchnNearOrgs(name) {
  var orgName = jQuery("#searchInput").val();
  alert('searching');
  if(jQuery.inArray(orgName, orgs) > -1)
  {
    var bounds = voteMap.getBounds();
     /*
    var countryCodes = [];
    for (countryCode in countriesInfo) {
      var countryInfo = countriesInfo[countryCode];
      var countryBounds = new GLatLngBounds(new GLatLng(countryInfo.bounds.southWest[0], countryInfo.bounds.southWest[1]), new GLatLng(countryInfo.bounds.northEast[0], countryInfo.bounds.northEast[1]));
      if (bounds.intersects(countryBounds)) {
         countryCodes.push(countryCode);
      }
    }
    */
    var arguments = {}
    //name to search for
    arguments.name = orgName;
    //current view, get center use haversine to poll based on radius rather than bounds
    //arguments.bounds =  exploreMap.getBounds();
    //country codes we are looking at
    //more app enginy way to do this? rpc? or encode a json string and use djangos simplejson lib
    //arguments.countryCode = countryCodes.join('|');
    alert('searching');
    jQuery.getJSON('/info/search',arguments,function(data,status)
    {
         var bounds = new google.maps.LatLngBounds();
         bounds.extend(voteMap.getCenter())
         searchedOrgs = data;
         markerManager.hide();
         markerManagerSearch.clearMarkers()
         markerManagerSearch.show()
         //zoom level 0 3 for country
         var markers = [];
         jQuery.each(searchedOrgs['zoomed'],  function(i, val)
         {
           markers.push(createOrgMarkerWithCount(createItem(val))); //image
           if(voteMap.getZoom() > 5)
           {
              bounds.extend(new GLatLng(val['item'][0][0],val['item'][0][1]));
           }
         });
       
        voteMap.setCenter(bounds.getCenter(),voteMap.getBoundsZoomLevel(bounds))
        markerManagerSearch.addMarkers(markers, 5);

        markers.length = 0;
        jQuery.each(searchedOrgs['countryLevel'],  function(i, val)
         {
            markers.push(createOrgMarkerWithCount(createItem(val)));
         });
         //all markers
          markerManagerSearch.addMarkers(markers, 0, 5);
          markerManagerSearch.refresh();
    });
  }
  else
  {
    var geocoder = new GClientGeocoder();
    geocoder.getLatLng(
    orgName,
    function(point) {
      if (!point) {
        //todo figure out what we do in this case
      } else {
        voteMap.setCenter(point, 13);
        var marker = new GMarker(point);
        voteMap.addOverlay(marker);
        //marker.openInfoWindowHtml() incase i want to add info of total votes around this area
      }
    }
  );
    
  }
}


function createItem(val)
{
  return {'center': val['item'][0], //lat lng
           'name': val['item'][1], //name
           'icon' :val['item'][2],
           'count': val.count};
}

