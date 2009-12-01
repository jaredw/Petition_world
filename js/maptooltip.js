// MapTooltip Class, Version 1.0
// @copyright (c) 2009 Gabriel Svennerberg (svennerberg.com)
//
// Author:  Gabriel Svennerberg
// Email:  gabriel@svennerberg.com
// Web:  http://www.svennerberg.com
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//  http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License. 
// 
// Subclassed GOverlay
//
// Adds tooltip as an overlay to objects in Google maps. So far it's been tested with 
// GMarkers, GPolyLines and GPolygons
//
// To get it to work it assumes that you've loaded the Google Maps Api
//
// The constructor takes two reguierd parameters and one optional
//
//  MapTooltip(reference:object, tooltip:string, opts?:object)
//
// opts is an object literal which take the following parameters
//
//  width    The width of the tooltip, ex: "100px"
//  padding    the padding around the content of the tooltip
//       For a 3px padding: "3px"
//       For a 2px top/bottom padding and a 5px left/right padding: "2px 5px"
//
//  backgroundColor  Backgroundcolor of the tooltip, ex: "#ff9"
//  color    The color of the text inside the tooltip, ex: "#000"
//  border    Styling of the border of the tooltip, ex: "1px solid green"
//  fontSize   The size of the text inside the tooltip, ex "1em"
//  offsetX    The horizontal distance in pixels from the pointer to the tooltip, ex "10"
//  offsetY    The vertical distance in piexels from the pointer to the tooltip, ex: "10"
//
// For more information on how to use this extension se http://www.svennerberg.com/2009/03/announcing-maptooltip/
//
// This extension is heavily inspired by the article "custom info window / popup for Google Maps, or loving the goverlay" at http://danmarvelo.us/older/2007/9/10/custom-info-window-for-google/

var MapTooltip = function(latlng, html, options) {
 this.latlng = latlng;
 this.html = html;
 this.options = options || {};
}

MapTooltip.prototype = new GOverlay();

MapTooltip.prototype.initialize = function(map) {
 var div = document.getElementById('MapTooltipContainer');

 if (!div) {
  var div = document.createElement('div');
  div.setAttribute('id', 'MapTooltipContainer');
 }

 // Setting the apperance of the tooltip
 if (this.options.maxWidth || this.options.minWidth) {
  div.style.maxWidth = this.options.maxWidth || '150px';
  div.style.minWidth = this.options.minWidth || '150px';
 } else {
  //div.style.width = this.options.width || '150px';
 }

 div.style.padding = this.options.padding || '2px 2px';
 div.style.backgroundColor = this.options.backgroundColor || '#999999';
 div.style.border = this.options.border || '1px dotted #FFFFFF';
 div.style.fontSize = this.options.fontSize || '18px';
 div.style.color = this.options.color || '#FFFFFF';

 // Positioning the tooltip
 div.innerHTML = this.html;
 div.style.position = 'absolute';
 div.style.zIndex = '1000';


 var pixelPosX = (map.fromLatLngToDivPixel(this.latlng)).x + this.options.offsetX;
 var pixelPosY = (map.fromLatLngToDivPixel(this.latlng)).y - 16;

 div.style.left = pixelPosX + 'px';
 div.style.top = pixelPosY + 'px';

 map.getPane(G_MAP_FLOAT_PANE).appendChild(div);

 this._map = map;
 this._div = div;
}

MapTooltip.prototype.remove = function() {
 if(this._div != null) {
  this._div.parentNode.removeChild(this._div); 
 }
}

MapTooltip.prototype.redraw = function(force) {
 // Not implemented
}


/* A Bar is a simple overlay that outlines a lat/lng bounds on the
 * map. It has a border of the given weight and color and can optionally
 * have a semi-transparent background color.
 * @param latlng {GLatLng} Point to place bar at.
 * @param opts {Object Literal} Passes configuration options - 
 *   weight, color, height, width, text, and offset.
 */
function MarkerLight(latlng, opts) {
  this.latlng = latlng;

  if (!opts) opts = {};

  this.backgroundColor_ = opts.backgroundColor || "#ffffff";
  this.label_ = opts.label;
  this.height_ = opts.size.height || 32;
  this.width_ = opts.size.width || 32;
  this.image_ = opts.image;
  this.useImg_ = opts.useImg || false;
  this.clicked_ = 0;
}

/* MarkerLight extends GOverlay class from the Google Maps API
 */
MarkerLight.prototype = new GOverlay();

/* Creates the DIV representing this MarkerLight.
 * @param map {GMap2} Map that bar overlay is added to.
 */
MarkerLight.prototype.initialize = function(map) {
  var me = this;

  // Create the DIV representing our MarkerLight
  var div = document.createElement("div");
  div.style.position = "absolute";
  div.style.cursor = 'pointer';
  if (this.useImg_) {
    var img = document.createElement("img");
    img.src = me.image_;
    img.width = me.width_;
    img.height = me.height_;
    div.appendChild(img);
    div.style.width = me.width_ + "px";
    div.style.height = me.height_ + "px";
    div.style.paddingLeft = "0px";
  } else if (this.image_) {
    div.style.backgroundImage = 'url(' + me.image_ + ')';
    div.style.width = me.width_ + "px";
    div.style.height = me.height_ + "px";
    div.style.paddingLeft = "0px";
  } else if (this.label_) {
    div.innerHTML = this.label_;
    div.style.padding = '2px 2px';
    div.style.textAlign = 'center';
    div.style.backgroundColor = this.backgroundColor_;
    div.style.border = this.border || '1px solid #FFFFFF';
    div.style.fontSize = '18px';
    div.style.color = this.color_ || '#ffffff';
  }

  GEvent.addDomListener(div, "click", function(event) {
    me.clicked_ = 1;
    GEvent.trigger(me, "click");
  });
  GEvent.addDomListener(div, "mouseover", function(event) {
    me.clicked_ = 1;
    GEvent.trigger(me, "mouseover");
  });
  GEvent.addDomListener(div, "mouseout", function(event) {
    me.clicked_ = 1;
    GEvent.trigger(me, "mouseout");
  });

  GEvent.addDomListener(div, "mouseover", function() {
    me.bringToFront_();
  });
  GEvent.addDomListener(div, "mouseout", function() {
    me.sendBack_();
  });

  map.getPane(G_MAP_MARKER_PANE).appendChild(div);

  this.map_ = map;
  this.div_ = div;
};

/* Remove the main DIV from the map pane
 */
MarkerLight.prototype.remove = function() {
  this.div_.parentNode.removeChild(this.div_);
};

/* Copy our data to a new MarkerLight
 * @return {MarkerLight} Copy of bar
 */
MarkerLight.prototype.copy = function() {
  var opts = {};
  opts.color = this.color_;
  opts.height = this.height_;
  opts.width = this.width_;
  opts.image = this.image_;
  return new MarkerLight(this.latlng, opts);
};

/* Redraw the MarkerLight based on the current projection and zoom level
 * @param force {boolean} Helps decide whether to redraw overlay
 */
MarkerLight.prototype.redraw = function(force) {

  // We only need to redraw if the coordinate system has changed
  if (!force) return;

  // Calculate the DIV coordinates of two opposite corners 
  // of our bounds to get the size and position of our MarkerLight
  var divPixel = this.map_.fromLatLngToDivPixel(this.latlng);

  // Now position our DIV based on the DIV coordinates of our bounds
  this.div_.style.left = (divPixel.x) + "px"
  this.div_.style.top = (divPixel.y) - this.height_ + "px";
};

MarkerLight.prototype.bringToFront_ = function() {
  var z = GOverlay.getZIndex(this.latlng.lat());
  this.div_.style.zIndex = 1e9;
}

MarkerLight.prototype.sendBack_ = function() {
  var z = GOverlay.getZIndex(this.latlng.lat());
  this.div_.style.zIndex = z;
}

/*
MarkerLight.prototype.getZIndex = function(m) {
  return GOverlay.getZIndex(marker.getPoint().lat())-m.clicked*10000;
}
*/

MarkerLight.prototype.getPoint = function() {
  return this.latlng;
};

MarkerLight.prototype.setStyle = function(style) {
  for (s in style) {
    this.div_.style[s] = style[s];
  }
};
