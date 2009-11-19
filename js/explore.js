google.load("search", "1.0")
google.load('friendconnect', '0.8');

// Needed for YouTube
window._uds_vbw_donotrepair = true;

var appPath = document.location.protocol + '//' +
              document.location.host + document.location.pathname;

var exploreMap;
var markerManager;
var maxZoomSeen = 0;
var countries;
var loadedCountries = false;
var loadedContinents = false;
var locationId = "global";
var toggler = 0;

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
  GEvent.addListener(exploreMap, "zoomend", handleZoomChange);
  GEvent.addListener(exploreMap, "moveend", handleBoundsChange);
  handleZoomChange();
  handleBoundsChange();
  jQuery.getJSON("/info/totals", processTotals);
  exploreMap.enableGoogleBar();
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
  markerManager.addMarkers(markers, 0, 2);
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
  markerManager.addMarkers(markers, 3, 5);
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

  markerManager.addMarkers(markers, 3, 5);
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

  markerManager.addMarkers(markers, 6);
  markerManager.refresh();
}

function processOrgs(json) {
  var orgs = json.orgs;
  var markers = [];
  
 
    for (var i = 0; i < orgs.length; i++) {
      var marker = createSmallOrgMarker(orgs[i]);
      markers.push(marker);
    }
    markerManager.addMarkers(markers, 5, 8); // 0 is the coarsest setting, full world view

 	markers = [];
    for (var i = 0; i < orgs.length; i++) {
      var marker = createMedOrgMarker(orgs[i]);
      markers.push(marker);
    }
    markerManager.addMarkers(markers, 9, 11); // 0 is the coarsest setting, full world view

 	markers = [];
    for (var i = 0; i < orgs.length; i++) {
      var marker = createOrgMarker(orgs[i]);
      markers.push(marker);
    }
    markerManager.addMarkers(markers, 12); // 0 is the coarsest setting, full world view


  markerManager.refresh();
}

function createOrgIcon(url) {
  var icon = new GIcon();
  icon.iconSize = new GSize(32, 32);
  icon.image = url;
  icon.shadow = null;
  icon.iconAnchor = new GPoint(16, 16);
  icon.infoWindowAnchor = new GPoint(16, 24);

  return icon;
}

function createMedOrgIcon(url) {
  var icon = new GIcon();
  icon.iconSize = new GSize(12, 12);
  icon.image = url;
  icon.shadow = null;
  icon.iconAnchor = new GPoint(16, 16);
  icon.infoWindowAnchor = new GPoint(16, 24);

  return icon;
}

function createSmallOrgIcon(url) {
  var icon = new GIcon();
  icon.iconSize = new GSize(6, 6);
  icon.image = url;
  icon.shadow = null;
  icon.iconAnchor = new GPoint(16, 16);
  icon.infoWindowAnchor = new GPoint(16, 24);

  return icon;
}

function createBigIcon(label) {
  var iconOptions = {};
  iconOptions.width = 64;
  iconOptions.height = 26;
  iconOptions.primaryColor = "#ca6618";
  iconOptions.label = "" + label;
  iconOptions.labelSize = 20;
  iconOptions.labelColor = "#FFFFFF";
  iconOptions.shape = "roundrect";
  var icon = MapIconMaker.createFlatIcon(iconOptions);
  icon.iconOptions = iconOptions;
  return icon;
}

function createMediumIcon(label) {
  var iconOptions = {};
  iconOptions.width = 48;
  iconOptions.height = 22;
  iconOptions.primaryColor =  "#0097c4";
  iconOptions.label = "" + label;
  iconOptions.labelSize = 16;
  iconOptions.labelColor = "#FFFFFF";
  iconOptions.shape = "roundrect";
  var icon = MapIconMaker.createFlatIcon(iconOptions);
  icon.iconOptions = iconOptions;
  return icon;
}

function createSmallIcon(label) {
  var iconOptions = {};
  iconOptions.width = 24;
  iconOptions.height = 18;
  iconOptions.primaryColor = "#85a20a";
  iconOptions.label = "" + label;
  iconOptions.labelSize = 12;
  iconOptions.labelColor = "#FFFFFF";
  iconOptions.shape = "roundrect";
  var icon = MapIconMaker.createFlatIcon(iconOptions);
  icon.iconOptions = iconOptions;
  return icon;
}

function locationString(country, state, city, postcode) {
  if (state) {
    return city + ", " + state + " " + postcode + ", " + country;
  } else {
    return city + ", " + postcode + ", " + country;
  }
}

function createOrgMarker(info) {
  var marker = new GMarker(new GLatLng(info.center[0], info.center[1]), {icon: createOrgIcon(info.icon)});
  GEvent.addListener(marker, "click", function() {
    marker.openInfoWindowHtml("<b>" + info.name + "</b>");
  });
  return marker;
}

function createMedOrgMarker(info) {
  var marker = new GMarker(new GLatLng(info.center[0], info.center[1]), {icon: createMedOrgIcon(info.icon)});
  GEvent.addListener(marker, "click", function() {
    marker.openInfoWindowHtml("<b>" + info.name + "</b>");
  });
  return marker;
}

function createSmallOrgMarker(info) {
  var marker = new GMarker(new GLatLng(info.center[0], info.center[1]), {icon: createSmallOrgIcon(info.icon)});
  GEvent.addListener(marker, "click", function() {
    marker.openInfoWindowHtml("<b>" + info.name + "</b>");
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

  var marker = new GMarker(latlng, {icon: icon});
  var tooltip = new MapTooltip(marker, title, {offsetX: icon.iconOptions.width - 6, backgroundColor: icon.iconOptions.primaryColor});
  GEvent.addListener(marker, "mouseover", function() {
    exploreMap.addOverlay(tooltip);
  });
  GEvent.addListener(marker, "mouseout", function() {
    exploreMap.removeOverlay(tooltip);
  });
  if (markerType != "continent") {
    var createInfoWindow = function() {
      jQuery.getJSON("/info/votelocal?" + markerType + "=" + locationCode, function (gfcSigners) {
        if (gfcSigners.length == 0) {
          marker.openInfoWindowHtml(
            '<p>' +
              icon.iconOptions.label + ' signed the petition here.' +
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
            marker.openInfoWindowHtml(
              gfcImageList +
              '<p>' +
                icon.iconOptions.label + ' signed the petition here.' +
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
    GEvent.addListener(marker, "infowindowopen", function() {
      var iw = exploreMap.getInfoWindow();
      GEvent.addListener(iw, "maximizeend", function() {
        window.setTimeout(function () {
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
          skin['HEADER_TEXT'] = 'Show your support of the vote in ' + title;
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
              "docId": SHA1(markerType + locationCode + title),
              "startMaximized": "true",
              "useFixedHeight": "true"
            }
          }, skin);
        }, 5);
      });
      window.setTimeout(function () {
        iw.maximize();
      }, 5);
    });
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
