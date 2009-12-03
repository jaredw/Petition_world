google.load("search", "1.0")
google.load('friendconnect', '0.8');

// Needed for YouTube
window._uds_vbw_donotrepair = true;

var appPath = document.location.protocol + '//' +
              document.location.host + document.location.pathname;

var exploreMap;
var markerManager;
var markerManagerSearch;
var maxZoomSeen = 0;
var countries;
var orgs;
var searchedOrgs;
var loadedCountries = false;
var loadedContinents = false;
var locationId = "global";
var toggler = 0;
var currentMarker;
var mapWidth;


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

/*
function loadVideoBar() {
  var videoBar;
  var options = {
    largeResultSet : true,
    horizontal : true,
    thumbnailSize : GSvideoBar.THUMBNAILS_SMALL,
    autoExecuteList : {
      cycleTime : GSvideoBar.CYCLE_TIME_MEDIUM,
      cycleMode : GSvideoBar.CYCLE_MODE_LINEAR,
      executeList : ["ytchannel:cop15"]
    }
  }
  videoBar = new GSvideoBar(
    jQuery("#videoBar-bar")[0],
    GSvideoBar.PLAYER_ROOT_FLOATING,
    options
  );
}
*/

jQuery(document).ready(function() {
  window.setInterval(animateTotals, 4000);

  /* location of rpc_relay.html and canvas.html */
  google.friendconnect.container.setParentUrl('/gfc/');
  //loadVideoBar();
  initExploreMap();
  initSearch();
  jQuery("#closeBar").click(closeBar);
  google.friendconnect.container.initOpenSocialApi({
    site: site_id,
    onload: function(securityToken) {
      var req = opensocial.newDataRequest();
      req.add(req.newFetchPersonRequest('VIEWER'), 'viewer');
      req.send(function(response) {
        var data = response.get('viewer').getData();
        if (data) {
          visitorId = data.getId();
          visitorName = data.getDisplayName();
          var nameField = jQuery('#person_name');
          if (nameField.val() == null || nameField.val().replace(/^\s+|\s+$/g, '') == '') {
            nameField.val(visitorName);
          }
          var gfcIdField = jQuery('#person_gfc_id');
          gfcIdField.val(visitorId);
        } else {
          // Not logged in
          visitorId = null;
          visitorName = null;
        }
      });
    }
  });
});


function closeBar(e)
{
  jQuery("#rightCol").hide();
  jQuery("#explore_map").width(570);
}

function initSearch() {
  jQuery("#explore_map").append(jQuery('#searchBar').show());
  jQuery.getJSON("/info/orgName", function(data,text)
  {
     orgs = data; 
  });
  jQuery("#searchButton").click(searchnNearOrgs);
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

function initExploreMap() {
 
  exploreMap = new GMap2(jQuery("#explore_map")[0]);
  exploreMap.setCenter(new GLatLng(0, 10), 1, G_PHYSICAL_MAP);
  exploreMap.setUIToDefault();

 
  
  
  var latlng = jQuery.cookie('latlng');
  if (latlng) {
    var point = new GLatLng(latlng.split(',')[0], latlng.split(',')[1]);
    exploreMap.setCenter(point, 8);
  }
  

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

function handleBoundsChange() {
 
  var bounds = exploreMap.getBounds();
  for (countryCode in countriesInfo) {
    var countryInfo = countriesInfo[countryCode];
    var countryBounds = new GLatLngBounds(new GLatLng(countryInfo.bounds.southWest[0], countryInfo.bounds.southWest[1]), new GLatLng(countryInfo.bounds.northEast[0], countryInfo.bounds.northEast[1]));
    if (bounds.intersects(countryBounds)) {
      if (!countryInfo.hasStates
       && !countryInfo.loadedPostcodes
       && exploreMap.getZoom() > 4) {
        jQuery.getJSON("/info/postcodes?countryCode=" + countryCode, processPostcodes);
        jQuery.getJSON("/info/orgs?countryCode=" + countryCode, processOrgs);
        countryInfo.loadedPostcodes = true;
      }
      if ( countryInfo.hasStates
       && !countryInfo.loadedStates
       && exploreMap.getZoom() > 2) {
        jQuery.getJSON("/info/states?countryCode=" + countryCode, processStates);
        countryInfo.loadedStates = true;
      }
      if ( countryInfo.hasStates
       && !countryInfo.loadedPostcodes
       && exploreMap.getZoom() > 4) {
        jQuery.getJSON("/info/postcodes?countryCode=" + countryCode, processPostcodes);
        jQuery.getJSON("/info/orgs?countryCode=" + countryCode, processOrgs);
        countryInfo.loadedPostcodes = true;
      }
    }
  }
}

function handleZoomChange() {    
 if (exploreMap.getZoom() > 2 && exploreMap.getZoom() < 6 && !loadedCountries) {
   jQuery.getJSON("/info/countries", processCountries);
   loadedCountries = true;
 }
 if (exploreMap.getZoom() >= 0 && exploreMap.getZoom() < 4 && !loadedContinents) {
   jQuery.getJSON("/info/continents", processContinents);
   loadedContinents = true;
 }
}

function processTotals(json) {
  jQuery("#votes").html(json.total.totalVotes);
  jQuery("#countries").html(json.total.totalCountries);
  jQuery("#orgs").html(json.total.totalOrgs);
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

function locationString(country, state, city, postcode) {
  if (state) {
    return city + ", " + state + " " + postcode + ", " + country;
  } else {
    return city + ", " + postcode + ", " + country;
  }
}

function resetMarkers() {
  loadedCountries = false;
  loadedContinents = false;
  //reset them all
  //could avoid this by doing a bounds check on the markers. 
  for (countryCode in countriesInfo) {
     countriesInfo[countryCode].loadedPostcodes = false;
     countriesInfo[countryCode].loadedStates = false;
  }
}

function createItem(val)
{
  return {'center': val['item'][0], //lat lng
           'name': val['item'][1], //name
           'icon' :val['item'][2],
           'count': val.count};
}


function searchnNearOrgs(name) {
  var orgName = jQuery("#searchInput").val();
  
  if($("#searchButton").val() == "Search")
  {

    if(jQuery.inArray(orgName, orgs) > -1)
    {
      var bounds = exploreMap.getBounds();
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
      jQuery.getJSON('/info/search',arguments,function(data,status)
      {
          $("#searchButton").val("Cancel");
           var bounds = new google.maps.LatLngBounds();
           bounds.extend(exploreMap.getCenter())
           searchedOrgs = data;
           markerManager.hide();
           markerManagerSearch.clearMarkers()
           markerManagerSearch.show()
           //zoom level 0 3 for country
           var markers = [];
           jQuery.each(searchedOrgs['zoomed'],  function(i, val)
           {
             markers.push(createOrgMarkerWithCount(createItem(val))); //image
             if(exploreMap.getZoom() > 5)
             {
                bounds.extend(new GLatLng(val['item'][0][0],val['item'][0][1]));
             }
           });
         
          exploreMap.setCenter(bounds.getCenter(),exploreMap.getBoundsZoomLevel(bounds))
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
          exploreMap.setCenter(point, 13);
          var marker = new GMarker(point);
          exploreMap.addOverlay(marker);
          //marker.openInfoWindowHtml() incase i want to add info of total votes around this area
        }
      }
    );
      
    }
  }
  else
  {
         markerManager.show();
         markerManagerSearch.clearMarkers()
         markerManagerSearch.hide()
        $("#searchButton").val("Search");
        jQuery("#searchInput").val('');
  }
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
    exploreMap.openInfoWindowHtml(marker.getPoint(), "<b>" + info.name + "</b><br />Total Votes: " + info.count, {pixelOffset: new GSize(16, -16)});
  });
  return marker;
}


function createOrgMarker(info) {
  var marker = new MarkerLight(new GLatLng(info.center[0], info.center[1]), createOrgIcon(info.icon));
  GEvent.addListener(marker, "click", function() {
    exploreMap.openInfoWindowHtml(marker.getPoint(), "<b>" + info.name + "</b>", {pixelOffset: new GSize(16, -16)});
  });
  return marker;
}

function createMedOrgMarker(info) {
  var marker = new MarkerLight(new GLatLng(info.center[0], info.center[1]), createMedOrgIcon(info.icon));
  GEvent.addListener(marker, "click", function() {
    exploreMap.openInfoWindowHtml(marker.getPoint(), "<b>" + info.name + "</b>", {pixelOffset: new GSize(8,-8)});
  });
  return marker;
}

function createSmallOrgMarker(info) {
  var marker = new MarkerLight(new GLatLng(info.center[0], info.center[1]), createSmallOrgIcon(info.icon));
  GEvent.addListener(marker, "click", function() {
    exploreMap.openInfoWindowHtml(marker.getPoint(), "<b>" + info.name + "</b>", {pixelOffset: new GSize(4, -4)});
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
    exploreMap.addOverlay(tooltip);
  });
  GEvent.addListener(marker, "mouseout", function() {
    exploreMap.removeOverlay(tooltip);
  });
  if (markerType != "continent") {
    var createInfoWindow = function() {
      currentMarker = marker;
      jQuery.getJSON("/info/votelocal?" + markerType + "=" + locationCode, function (gfcSigners) {
        if (gfcSigners.length == 0) {
          exploreMap.openInfoWindowHtml(latlng,
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
            exploreMap.openInfoWindowHtml(latlng,
              gfcImageList +
              '<p>' +
                icon.label + ' signed the petition here.' +
              '</p>' +
              '<p>' +
              '<a href="javascript:exploreMap.getInfoWindow().maximize()">Discuss</a>' +
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
