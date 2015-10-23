/// an.subproperty-tween.js - version 0.2 - An Release 1.0
//
// Copyright (c) 2011-2014. Adobe Systems Incorporated.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//   * Redistributions of source code must retain the above copyright notice,
//     this list of conditions and the following disclaimer.
//   * Redistributions in binary form must reproduce the above copyright notice,
//     this list of conditions and the following disclaimer in the documentation
//     and/or other materials provided with the distribution.
//   * Neither the name of Adobe Systems Incorporated nor the names of its
//     contributors may be used to endorse or promote products derived from this
//     software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

/***
 @name SubpropertyTween
 @class Defines a complex tween that can animate the multiple sub-properties of a complex CSS property.
 This defines a tween type of "subproperty' which can parse multiple properties with multiple types.
 It also extends the framework's Property setting for constructed dom elements for the supported subproperties.
 */

(function (Edge) {
	"use strict";
	
	var $ = Edge.$,
			PropertyTween = Edge.PropertyTween,
			UpdateFinalizer = Edge.UpdateFinalizer,
			subprop;
	
	var propTemplates = {
		'box-shadow': {
			def: 'box-shadow',
			'-webkit-box-shadow': "boxShadow.color boxShadow.offsetH boxShadow.offsetV boxShadow.blur boxShadow.spread boxShadow.inset".split(' '),
			'-moz-box-shadow': "boxShadow.color boxShadow.offsetH boxShadow.offsetV boxShadow.blur boxShadow.spread boxShadow.inset".split(' '),
			'box-shadow': "boxShadow.color boxShadow.offsetH boxShadow.offsetV boxShadow.blur boxShadow.spread boxShadow.inset".split(' ')
		},
		'text-shadow': {
			def: 'text-shadow',
			'text-shadow': ["textShadow.color", "textShadow.offsetH", "textShadow.offsetV", "textShadow.blur"] // using split costs bytes for less than 5 items
		},
		'filter': {
			def: '-webkit-filter',
			'-webkit-filter': "filter.invert filter.hue-rotate filter.contrast filter.saturate filter.brightness filter.sepia filter.grayscale filter.blur filter.drop-shadow.color filter.drop-shadow.offsetH filter.drop-shadow.offsetV filter.drop-shadow.blur".split(' '),
			'-moz-filter': "filter.invert filter.hue-rotate filter.contrast filter.saturate filter.brightness filter.sepia filter.grayscale filter.blur filter.drop-shadow.color filter.drop-shadow.offsetH filter.drop-shadow.offsetV filter.drop-shadow.blur".split(' '),
			'filter': "filter.invert filter.hue-rotate filter.contrast filter.saturate filter.brightness filter.sepia filter.grayscale filter.blur filter.drop-shadow.color filter.drop-shadow.offsetH filter.drop-shadow.offsetV filter.drop-shadow.blur".split(' ')
		},
		'background-size': {
			def: 'background-size',
			'background-size': ["background-size.x", "background-size.y"]
		},
		'background-position': {
			def: 'background-position',
			'background-position': ["background-position.x", "background-position.y"]
		}
	};

	// u: default units
	// i: index in dom declaration
	// j: subindex in dom declaration
	// cssProp: actual css property to set
	// domProp: name of parent prop field in dom. Defaults to camelized cssProp if not supplied
	var subpropLookup = {
		'boxShadow.offsetH': {cssProp: "box-shadow", type: "style", def: "0px", u: "px", i: 1},
		'boxShadow.offsetV': {cssProp: "box-shadow", type: "style", def: "0px", u: "px", i: 2},
		'boxShadow.blur': {cssProp: "box-shadow", type: "style", def: "0px", u: "px", i: 3},
		'boxShadow.spread': {cssProp: "box-shadow", type: "style", def: "0px", u: "px", i: 4},
		'boxShadow.color': {cssProp: "box-shadow", type: "color", def: "rgba(0,0,0,0)", i: 5},
		'boxShadow.inset': {cssProp: "box-shadow", def: "", i: 0},
		'textShadow.offsetH': {cssProp: "text-shadow", type: "style", def: "0px", u: "px", i: 1},
		'textShadow.offsetV': {cssProp: "text-shadow", type: "style", def: "0px", u: "px", i: 2},
		'textShadow.blur': {cssProp: "text-shadow", type: "style", def: "0px", u: "px", i: 3},
		'textShadow.color': {cssProp: "text-shadow", type: "color", def: "rgba(0,0,0,0)", i: 0},
		// Note that filter.drop-shadow is an array in dom declaration
		'filter.drop-shadow.color': {cssProp: "filter", type: "color", def: "rgba(0,0,0,0)", strReplace: "drop-shadow(%1", combinedNum: 4, i: 8},
		'filter.drop-shadow.offsetH': {cssProp: "filter", type: "style", def: "0px", u: "px", i: 9},
		'filter.drop-shadow.offsetV': {cssProp: "filter", type: "style", def: "0px", u: "px", i: 10},
		'filter.drop-shadow.blur': {cssProp: "filter", type: "style", def: "0px", strReplace: "%1)", u: "px", i: 11},
		'filter.grayscale': {cssProp: "filter", type: "style", def: "0", strReplace: "grayscale(%1)", i: 6},
		'filter.sepia': {cssProp: "filter", type: "style", def: "0", strReplace: "sepia(%1)", i: 5},
		'filter.saturate': {cssProp: "filter", type: "style", def: "1", strReplace: "saturate(%1)", i: 3},
		'filter.hue-rotate': {cssProp: "filter", type: "style", def: "0deg", strReplace: "hue-rotate(%1)", u: "deg", i: 1},
		'filter.invert': {cssProp: "filter", type: "style", def: "0", strReplace: "invert(%1)", i: 0},
		'filter.brightness': {cssProp: "filter", type: "style", def: "0", strReplace: "brightness(%1)", i: 4},
		'filter.contrast': {cssProp: "filter", type: "style", def: "1", strReplace: "contrast(%1)", i: 2},
		'filter.blur': {cssProp: "filter", type: "style", def: "0px", strReplace: "blur(%1)", u: "px", i: 7},
		'background-position.x': {cssProp: 'background-position', type: 'style', def: '0px', u: 'px', i: 2, domProp: 'fill'},
		'background-position.y': {cssProp: 'background-position', type: 'style', def: '0px', u: 'px', i: 3, domProp: 'fill'},
		'background-size.x': {cssProp: 'background-size', type: 'style', def: '100%', u: '%', i: 4, domProp: 'fill'},
		'background-size.y': {cssProp: 'background-size', type: 'style', def: '100%', u: '%', i: 5, domProp: 'fill'}
	};

	var subpropertyId = 1,
			funcs = {
				setValue:function (tt, prop, val) {
					var data = Edge.$.data(this, subpropLookup[prop].cssProp);
					data[prop] = val;
				},
				getValue:function (prop, tt) {
					var data = Edge.$.data(this, subpropLookup[prop].cssProp);
				},
				setupForAnimation:function () {
					var elements = this.getElementSet();
					var tween = this;
					elements.each(function () {
						var data = Edge.$.data(this, tween.superProperty);
						if (!data) {
							// Get the current values on the element and save
							data = tween.buildProp(this);
							Edge.$.data(this, tween.superProperty, data);
						}
					});

					PropertyTween.prototype.setupForAnimation.call(this);
				},
				buildProp:function (ele) {
					var j;
					var data = {};
					var propName = this.superProperty;
					
					// add the retrieved values
					var props = Edge.getSubProps(ele, propName);
					for (j in props) {
						if (props.hasOwnProperty(j)) {
							data[j] = props[j];
						}
					}
					data.id = this.superProperty + subpropertyId;
					subpropertyId += 1;
					data.element = ele;
					data.prop = propName;
					data.onFinalUpdate = _applySubproperty;

					return data;
				},
				update:function (elapsed, easingConst) {
					PropertyTween.prototype.update.call(this, elapsed, easingConst);
					var elements = this.getElementSet();
					var tween = this;
					var prop = this.property;
					var tt = this.tweenType;

					elements.each(function () {
						// We only want to tween if the property data has a
						// matching animation id. If the ids don't match, that
						// means another animation has started which is modifying
						// this same property.

						var td = tween.getPropertyTweenData(this, tt, prop);
						if (td.animationID !== tween.animationID) {
							return;
						}

						var data = Edge.$.data(this, tween.superProperty);
						data.timeline = tween.timeline;
						data.tween = tween;
						UpdateFinalizer.Register(tween.timeline, data.id, data);
					});
				}
			};

	function SubpropertyTween (tweenType, property, elements, fromVal, val, opts) {
		if (subpropLookup[property] !== null) {
			this.superProperty = subpropLookup[property].cssProp;
			tweenType = subpropLookup[property].type;
			if (tweenType === "color") {
				if (Edge.ColorTween) {
					$.extend(this, Edge.ColorTween.prototype);
					$.extend(this, funcs);
					Edge.ColorTween.call(this, tweenType, property, elements, fromVal, val, opts);
				}
				// TODO throw something if no color-tween
			} else {
				$.extend(this, PropertyTween.prototype);
				$.extend(this, funcs);
				Edge.PropertyTween.call(this, tweenType, property, elements,  fromVal, val, opts);
			}
		}
		// TODO: Error?
		this.name = "subpropertyTween";
	}

	SubpropertyTween.prototype.constructor = SubpropertyTween;
	
	function decomposeFilterSubprops(style, prop, propOrder) {
		// Just in case there is a color property, we need to strip out the spaces first...
		style = style.replace(/,\s*/g, ",");
		var styles = [], val;
		styles["filter.invert"] = (val = style.match(/invert\((.*?)\)/)) ? val[1] : null;
		styles["filter.hue-rotate"] = (val = style.match(/hue-rotate\((.*?)\)/)) ? val[1] : null;
		styles["filter.contrast"] = (val = style.match(/contrast\((.*?)\)/)) ? val[1] : null;
		styles["filter.saturate"] = (val = style.match(/saturate\((.*?)\)/)) ? val[1] : null;
		styles["filter.brightness"] = (val = style.match(/brightness\((.*?)\)/)) ? val[1] : null;
		styles["filter.sepia"] = (val = style.match(/sepia\((.*?)\)/)) ? val[1] : null;
		styles["filter.grayscale"] = (val = style.match(/grayscale\((.*?)\)/)) ? val[1] : null;
		styles["filter.blur"] = (val = style.match(/blur\((.*?)\)/)) ? val[1] : null;
		var dropShadow = (val = style.match(/drop-shadow\((.*?\)\s*.*?)\)/)) ? val[1].split(" ") : [null, null, null, null];
		styles["filter.drop-shadow.color"] = dropShadow[0];
		styles["filter.drop-shadow.offsetH"] = dropShadow[1];
		styles["filter.drop-shadow.offsetV"] = dropShadow[2];
		styles["filter.drop-shadow.blur"] = dropShadow[3];
		
		var returnValue = [];
		var i;
		for (i = 0; i < propOrder.length; i += 1) {
			returnValue[propOrder[i]] = styles[propOrder[i]] || subpropLookup[propOrder[i]].def;
		}
		
		return returnValue;        
	}

	function decomposeSubprops(style, prop, propOrder) {
		// Just in case there is a color property, we need to strip out the spaces first...
		style = style.replace(/,\s*/g, ",");
		var styles = style.split(" ");
		var returnValue = [];
		var i;
		for (i = 0; i < propOrder.length; i += 1) {
			returnValue[propOrder[i]] = styles[i] || subpropLookup[propOrder[i]].def;
		}
		return returnValue;
	}

	function getSubProps(ele, prop) {
		var $ele = $(ele);
		var style, i;
		for (i in propTemplates[prop]) {
			if (propTemplates[prop].hasOwnProperty(i)) {
				style = $ele.css(i);
				if (style && style !== "" && style !== "none") {
					if(prop == "filter") return decomposeFilterSubprops(style, prop, propTemplates[prop][i]);
					return decomposeSubprops(style, prop, propTemplates[prop][i]);
				}
			}
		}

		return [];
	}
	Edge.getSubProps = getSubProps;

	function getSubType (s) {
		return subpropLookup[s] ? subpropLookup[s].type : undefined;
	}

	SubpropertyTween.getSubType = getSubType;

	function getStyle (s) {
		return subpropLookup[s] ? subpropLookup[s].cssProp : undefined;
	}

	SubpropertyTween.getStyle = getStyle;

	SubpropertyTween.applySubproperty = function (ele, data, tween) {
		var val, prop, i, subVal,
				$ele = $(ele);

		// Set up the CSS string to set
		// loop through all the browser specific css props and set them
		for (prop in propTemplates[data.prop]) {
			if (prop !== "def" && propTemplates[data.prop].hasOwnProperty(prop)) {
				val = "";
				var combinedSubIsDefault = true;
				for (i = 0; i < propTemplates[data.prop][prop].length; i += 1) {
					subVal = data[propTemplates[data.prop][prop][i]];
					if (subVal === undefined) {
						subVal = subpropLookup[propTemplates[data.prop][prop][i]].def;
					}
					if ("combinedNum" in subpropLookup[propTemplates[data.prop][prop][i]]) {
						combinedSubIsDefault = true;
						for (var j = i; j < i + subpropLookup[propTemplates[data.prop][prop][i]].combinedNum; j++) {
							if (data[propTemplates[data.prop][prop][j]] !== undefined && data[propTemplates[data.prop][prop][j]] != subpropLookup[propTemplates[data.prop][prop][j]].def) {
								combinedSubIsDefault = false;
							}
						}
					}
					if (!propTemplates[data.prop][prop][i].match(/^filter./) || (subVal != subpropLookup[propTemplates[data.prop][prop][i]].def || !combinedSubIsDefault)) {
						if ("strReplace" in subpropLookup[propTemplates[data.prop][prop][i]]) {
							subVal = subpropLookup[propTemplates[data.prop][prop][i]].strReplace.replace("%1", subVal);
						}
						val += subVal;
						if (i !== propTemplates[data.prop][prop].length - 1) {
							val += " ";
						}
					}
				}
				if ((window.edge_authoring_mode && prop === propTemplates[data.prop].def) || !window.edge_authoring_mode) {
					$ele.css(prop, val);
				}
			}
		}

		if (tween && tween.notifier.obs.length) {
			tween.notifyObservers("onUpdate", {elapsed:0, easingConst:0, property:prop, value:val, element:$ele[0]});
		}
	};

	function _applySubproperty () {
		// Note that this is called with 'this' set to the handler object
		var data = Edge.$.data(this.element, this.prop);
		if (data) {
			SubpropertyTween.applySubproperty(this.element, data, data.tween);
		}
	}

	// Monkey patch for Prop's apply method
	function applySubprop ($ele, val) {
		var ele = $ele[0],
				prop = this.name;

		var data = Edge.$.data(ele, subpropLookup[prop].cssProp);
		if (!data) {
			data = funcs.buildProp.call({superProperty:subpropLookup[prop].cssProp}, ele);
			Edge.$.data(ele, subpropLookup[prop].cssProp, data);
		}
		data[prop] = val;
		data.onFinalUpdate.call({element:ele, prop:subpropLookup[prop].cssProp});
	}


	Edge.SubpropertyTween = SubpropertyTween;

	var subpropertyTweenName = "subproperty";
	Edge.Timeline.addTweenType(subpropertyTweenName, function (prop, ele, fromVal, toVal, opts) {
		return new SubpropertyTween(subpropertyTweenName, prop, ele, fromVal, toVal, opts);
	});

	// Now register all our subproperty names
	var defn, sp;

	for (subprop in subpropLookup) {
		defn = {};
		if (subpropLookup.hasOwnProperty(subprop)) {
			Edge.Timeline.addTweenProperty(subprop, subpropertyTweenName);
			sp = subpropLookup[subprop];
			defn[subprop] = {
				f:sp.domProp || Edge.camelize(sp.cssProp),
				i:sp.i,
				j:sp.j,
				def:sp.def
			};
			if (subpropLookup[subprop].u) {
				defn[subprop].u = subpropLookup[subprop].u;
			}

			Edge.defineProps(defn);
			Edge._.p[subprop].apply = applySubprop;
		}
	}

})(window.AdobeEdge);