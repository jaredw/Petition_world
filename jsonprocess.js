// generate states info
var str = [];
for (var i = 0; i < places.length; i++) {
  var place = places[i];
  str.push('  "' + place.state.toUpperCase() + '": {' + '"name": "' + place.name + '", "center": [' + place.centroid[1] + ',' + place.centroid[0] + ']}');
}
//console.log(str.join(",\n"));

// Load http://gmaps-samples.googlecode.com/svn/trunk/versionchecker.html?v=2
// Copy geodata.py into FB console, remove top line
// Run this code below
// Open js/countrybounds.js in WordPad, copy results in
var str = [];
for (var countryCode in countries) {
  var country = countries[countryCode];
   var polylines = [];
  for (var j = 0; j < country.points.length; j++) {
    polylines.push({points: country.points[j], levels: country.levels[j], color: "#00FF00",  numLevels: 18, zoomFactor: 2});
  }

  var poly = new GPolygon.fromEncoded({
      polylines: polylines,
      fill: true,
      color: "#FF0000",
      outline: true
    });
  var bounds = poly.getBounds();
  var hasStates = false;
  if (country.states) hasStates = true;
   var hasPostcodes = false;
  if (country.postcode > 0) hasPostcodes = true;
   var newStr = '"' + countryCode + '": { "hasPostcodes": ' + hasPostcodes + ', "hasStates": ' + hasStates + ', "bounds": ' + ' {"southWest": [' + bounds.getSouthWest().toUrlValue(6) + '], "northEast": [' + bounds.getNorthEast().toUrlValue(6) + ']}, "name": "' + country.name + '"';
 
  if (hasStates) {
    newStr += ',"states": ['
    states = [];
    for (var stateCode in country.states) {
      states.push('"' + stateCode + '"');
    }
    newStr += states.join(",") + ']';
  }
  newStr += '}';
  str.push(newStr);

  //map.addOverlay(new GPolyline([bounds.getSouthWest(), bounds.getNorthEast()], '#0000ff', 8, .7));
  //map.addOverlay(new GMarker(poly.getBounds().getNorthEast(), {title: country.name}));
}
//console.log('var countriesInfo = {\n' + str.join(",\n") + '}');
