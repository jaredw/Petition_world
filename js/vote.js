google.load("search", "1.0")
google.load("earth", "1");
google.load('friendconnect', '0.8');

var nonce;
var geocodeInProgress;
var visitorId = null;
var visitorName = null;
var locationId = "global";
var voteMap;

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

jQuery(document).ready(function() {
  jQuery('#show_your_vote').tabs('option', 'selected', 1);
  loadNonce();
  jQuery('.org').hide();
  jQuery('#sign').validate({
      //overwrite to change the way errors are reported
      //the extra space was kinda hard to fit in the new forms 
    showErrors: function(errorMap, errorList) {
            if (errorList.length > 0) {
                $(errorList).each(function() {
                    $("[for='" +this.element.name + "']").addClass(" Error");
                });
            } else {
                $(this.lastElement).each(function() {
                    $("[for='" + this.id + "']").removeClass("Error");
                });
            }           
  }});
  /* location of rpc_relay.html and canvas.html */
  google.friendconnect.container.setParentUrl('/gfc/');

  initVoteMap();
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
          var nameInfo = jQuery('#person_name_info');
          nameInfo.html("You are signing as " + visitorName + ".");
          var gfcIdField = jQuery('#person_gfc_id');
          gfcIdField.val(visitorId);
        } else {
          // Not logged in
          visitorId = null;
          visitorName = null;
          var nameInfo = jQuery('#person_name_info');
          nameInfo.html("<div style='margin-left:120px;margin-top:-10px;'>Vote with your name using Friend Connect,<br>or keep your vote anonymous here.</div>");
        }
      });
    }
  });

  populateCountries();
});

function initVoteMap() {
  voteMap = new GMap2(jQuery("#vote_map")[0]);
  voteMap.setCenter(new GLatLng(0,180), 0);
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
