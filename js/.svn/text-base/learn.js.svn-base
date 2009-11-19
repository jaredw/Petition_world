// google.load("jquery", "1.3.2");
// google.load("jqueryui", "1.7.2");
google.load("search", "1.0")
google.load("earth", "1");
google.load('friendconnect', '0.8');


var ge;
var currentTourKmlObject = null; // a KmlTour object
var currentFetchedKmlObject = null; // the original fetchKml'd target
var currentTourIndex = -1;
var currentExtraKmlsObject = null;
var loadingOverlay = null;

var appPath = document.location.protocol + '//' +
              document.location.host + document.location.pathname;

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

/**
 * Init function called when the DOM is ready.
 */
function learnInit() {
  jQuery('#earth_container').show();
  if (!checkTourHash()) {
    // Timeout is required here, or the Earth plugin has problems.
    setTimeout(function() {
      loadPlugin('earth', function() {
        if (loadingOverlay)
          loadingOverlay.setVisibility(false);
      });            
    }, 1);
  }

  // Generate the tour selection list.
  var tourListNode = jQuery('#learn #tourlist');
  // Clear the tour list
  tourListNode.html('');
  for (var i = 0; i < tourList.length; i++) {
    var tour = tourList[i];

    // Create the tour link and its container.
    var linkNode = jQuery(document.createElement('li'));
    linkNode.attr('id', 'tourind-' + i);

    // Handle clicks on the tour links.
    linkNode.click((function(tourIndex) {
      return function(e) {
        document.location.hash = '#' + tourList[tourIndex].id;
        loadTour(tourIndex);
      };
    })(i));

    var thumbnailNode = jQuery(document.createElement('img'));
    thumbnailNode.attr('src', tour.thumbnail);
    linkNode.append(thumbnailNode);

    var titleNode = jQuery(document.createElement('span'));
    titleNode.addClass('title');
    titleNode.html(tour.title);
    linkNode.append(titleNode);

    if (tour.duration) {
      var metaNode = jQuery(document.createElement('span'));
      metaNode.addClass('meta');
      metaNode.html('&nbsp;(' + tour.duration + ')');
      titleNode.append(metaNode);
    }

    if (tour.narrator) {
      var narratorNode = jQuery(document.createElement('span'));
      narratorNode.addClass('narrator');
      narratorNode.html('with ' + tour.narrator);
      linkNode.append(narratorNode);
    }

    tourListNode.append(linkNode);
  }

  // Hide the 'Loading' message and show the tourList list.
  jQuery('#tourlist_status').hide();
  jQuery('#tourlist_container').show();

  // Watch the document location hash for changes.
  window.setInterval(checkTourHash, 100);
}

/**
 * Check the document location hash/anchor and load the requested tour
 * if the anchor changes.
 * @return Returns true if the hash has changed and a new tour is loading, and
 *     false otherwise.
 */
function checkTourHash() {
  var destID = document.location.hash.match(/(\w+)/);
  if (destID)
    destID = destID[1];

  if (destID && (currentTourIndex < 0 ||
                 destID != tourList[currentTourIndex].id)) {

    // Find the tour with this ID.
    var destTourIndex = -1;
    for (var i = 0; i < tourList.length; i++) {
      if (tourList[i].id == destID) {
        destTourIndex = i;
        break;
      }
    }

    // Select the tour and open it up.
    if (destTourIndex >= 0) {
      loadTour(destTourIndex);
      return true;
    }
  }

  return false;
}

/**
 * Load the Google Earth Plugin instance, deleting any existing instance.
 * @param {string} mapType The planet type to load (either 'mars' or 'earth').
 */
function loadPlugin(mapType, callback) {
  google.earth.createInstance('map3d', function(pluginInstance) {
    // Earth Init Callback
    ge = pluginInstance;
    ge.getWindow().setVisibility(true);
    ge.getNavigationControl().setVisibility(ge.VISIBILITY_AUTO);

    // Create the loading overlay.
    var loadingImage = ge.createIcon('');
    loadingImage.setHref(appPath + 'images/loading.png');

    loadingOverlay = ge.createScreenOverlay('');
    loadingOverlay.setIcon(loadingImage);
    loadingOverlay.getOverlayXY().set(
        25, ge.UNITS_PIXELS, 25, ge.UNITS_INSET_PIXELS);
    loadingOverlay.getScreenXY().set(
        0, ge.UNITS_FRACTION, 1, ge.UNITS_FRACTION);
    loadingOverlay.getSize().set(-1, ge.UNITS_FRACTION, -1, ge.UNITS_FRACTION);
    ge.getFeatures().appendChild(loadingOverlay);

    // Load default view.
    var lookAt = ge.createLookAt('');
    lookAt.set(0.5, 0.5, 0, ge.ALTITUDE_RELATIVE_TO_GROUND,
        0, 0, 7000000);
    ge.getView().setAbstractView(lookAt);

    if (callback) {
      callback.call(null);
    }
  }, function(errorCode) {
    // Earth Failure Callback
    if (errorCode == 'ERR_NOT_INSTALLED' ||
        errorCode == 'ERR_CREATE_PLUGIN' && !google.earth.isInstalled()) {
      jQuery('#tourlist_status').html(
        'To tour the world in your browser, you must first install the ' +
        'Google Earth Plugin by clicking the download link to the right.'
      );
    } else {
      jQuery('#tourlist_status').addClass('error').html(
        'There was an error loading the touring application.'
      );
    }
  }, (mapType == 'mars' ?
         { database: 'http://khmdb.google.com/?db=mars' } : {}));
}

/**
 * Load the given tour and begin playback, stopping any currently playing tours.
 * Also selects the link to the tour and scrolls the link into view.
 */
function loadTour(tourIndex) {
  if (currentTourIndex == tourIndex)
    return;

  // Deselect the currently playing tour's link.
  var oldTourIndex = currentTourIndex;
  if (currentTourIndex >= 0) {
    document.getElementById('tourind-' + oldTourIndex).className = '';
    currentTourIndex = -1;
  }

  // Mark the link as selected and scroll it into view.
  var linkNode = document.getElementById('tourind-' + tourIndex);
  if (!linkNode)
    return;

  linkNode.className = 'selected';
  if ('linkNode' in linkNode)
    linkContainerNode.scrollIntoView(false);

  currentTourIndex = tourIndex;

  // Set up the embed link.
  resetEmbedLink(currentTourIndex);

  // Reload the plugin if necessary.
  if (!ge || oldTourIndex < 0 || tourList[currentTourIndex].mapType !=
                                 tourList[oldTourIndex].mapType) {
    learnReset();
    loadPlugin(tourList[currentTourIndex].mapType, continueLoadTour_);
  } else {
    if (loadingOverlay)
      loadingOverlay.setVisibility(true);

    continueLoadTour_(null);
  }
}

var overlays;
var captions;

/**
 * Continuation function for loadTour()
 */
function continueLoadTour_() {
  // Stop any currently playing tour.
  if (currentTourKmlObject) {
    //ge.getTourPlayer().reset();
    ge.getTourPlayer().setTour(null);
  }

  // Turn on/off extra layers.
  if (tourList[currentTourIndex].options) {
    ge.getLayerRoot().enableLayerById(ge.LAYER_BUILDINGS,
        tourList[currentTourIndex].options.buildings ? true : false);
  }

  // Load the first (or tourNumber'th) <gx:Tour> in the tour's KML URL.
  var tourNumber = tourList[currentTourIndex].tourNumber || 1;
  var tourIndexAtFetch = currentTourIndex;

  google.earth.fetchKml(
    ge,
    tourList[currentTourIndex].url,
    function(kmlObject) {
      if (!kmlObject) {
        // TODO(romannurik): non-obtrusive error.
        return;
      }

      // If the user clicks a different tour while this one is being fetched,
      // cancel the loading of this tour.
      if (tourIndexAtFetch != currentTourIndex) {
        return;
      }

      if (currentFetchedKmlObject) {
        ge.getFeatures().removeChild(currentFetchedKmlObject);
        currentFetchedKmlObject = null;
      }

      currentFetchedKmlObject = kmlObject;
      ge.getFeatures().appendChild(currentFetchedKmlObject);

      overlays = {};

      // Walk the loaded KML object hierarchy looking for a <gx:Tour>.
      walkKmlDom(kmlObject, function(context) {

        if (this.getType() == 'KmlScreenOverlay') {
          overlays[this.getId()] = this;
        }
        if (this.getType() == 'KmlTour' && !--tourNumber) {
          ge.getTourPlayer().setTour(this);

          // Hide the loading overlay.
          if (loadingOverlay)
            loadingOverlay.setVisibility(false);

          ge.getTourPlayer().play();

          currentTourKmlObject = this;
          //return false;
        }
      });

      // Remove any existing extra KMLs folder.
      if (currentExtraKmlsObject) {
        ge.getFeatures().removeChild(currentExtraKmlsObject);
        currentExtraKmlsObject = null;
      }

      loadCaptions(currentTourIndex);

      google.earth.addEventListener(ge, 'frameend', viewChanged);

      var tour = tourList[currentTourIndex];

      // Load any extra KML files necessary to view this tour into a new
      // folder.
      var extraKmls = tour.extraKmls || [];
      var currentExtraKmlsObject = ge.createFolder('');
      ge.getFeatures().appendChild(currentExtraKmlsObject);

      for (var i = 0; i < extraKmls.length; i++) {
        // Create a network link to this extra KML file
        // and place it in the extra KMLs folder.
        var link = ge.createLink('');
        link.setHref(extraKmls[i]);

        var networkLink = ge.createNetworkLink('');
        networkLink.setLink(link);

        currentExtraKmlsObject.getFeatures().appendChild(networkLink);
      }

      var footer_link = document.getElementById('footer_link');
      footer_link.href = tour.url;
      footer_link.innerHTML = "Open these layers and tour in Google Earth now!";
    }
  );
}

function loadCaptions(tourIndex) {
  $.getJSON('tours/captions' + tourIndex + '.js', captionsLoaded);
}

function captionsLoaded(json) {
  captions = json;
}


function viewChanged() {
  var caption = '';
  for (var id in captions) {
    var overlay = overlays[id];
    if (overlay.getVisibility()) {
      caption = captions[id];
    }
  }

  var oldCaption = $('#caption').html();
  if (oldCaption != caption) {
    $('#caption').html(caption);
  }
}

/**
 * Resets the 'embed this tour...' link to point to the Gadget wizard for
 * the tour at the given index in the tour list.
 */
function resetEmbedLink(tourIndex) {
  // Construct the embed link URL.
  var tourSpec = tourList[tourIndex];
  var tourOptions = tourSpec.options || {};

  var urlParams = {
    url: 'http://code.google.com/apis/kml/embed/tourgadget.xml',
    synd: 'open',
    title: tourSpec.title, // Gadgets apparently doesn't use this :(
    up_kml_url: tourSpec.url,
    up_tour_index: tourSpec.tourNumber || 1,
    up_show_navcontrols: 0,
    up_show_buildings: tourOptions.buildings ? 1 : 0,
    up_type_mars: (tourSpec.mapType == 'mars') ? 1 : 0
  };

  var urlParamArr = [];
  for (var key in urlParams) {
    urlParamArr.push(key + '=' + encodeURIComponent(urlParams[key]));
  }

  var baseUrl = 'http://www.gmodules.com/ig/creator';
  var embedUrl = baseUrl + '?' + urlParamArr.join('&');

  // Set the embed link properties.
  var embedSectionNode = document.getElementById('embedsection');
  if (embedSectionNode) {
    embedSectionNode.style.visibility = 'visible';
  }

  var embedLinkNode = document.getElementById('embedlink');
  if (embedLinkNode) {
    embedLinkNode.href = embedUrl;
  }
}

jQuery(document).ready(function() {
  learnInit();
  /* location of rpc_relay.html and canvas.html */
  google.friendconnect.container.setParentUrl('/gfc/');

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
