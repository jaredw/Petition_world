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

var MapTooltip = function(obj, html, options) {
 this.obj = obj;
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
 div.style.backgroundColor = this.options.backgroundColor || '#B3E742';
 div.style.border = this.options.border || '1px solid #FFFFFF';
 div.style.fontSize = this.options.fontSize || '18px';
 div.style.color = this.options.color || '#FFFFFF';

 // Positioning the tooltip
 div.innerHTML = this.html;
 div.style.position = 'absolute';
 div.style.zIndex = '1000';


 var pixelPosX = (map.fromLatLngToDivPixel(this.obj.getLatLng())).x + this.options.offsetX;
 var pixelPosY = (map.fromLatLngToDivPixel(this.obj.getLatLng())).y - 16;

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
