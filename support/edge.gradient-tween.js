/// edge.gradient-tween.js - version 0.2 - An Release 1.0
//
// Copyright (c) 2011. Adobe Systems Incorporated.
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
 @name GradientTween
 @class Defines a tween that can animate the background-image gradients.
 This defines a tween type of 'gradient' which can parse gradient properties.
 */

/*global window: true, document: true, EdgeAn: true */

(function (Edge) {

	"use strict";

	var $ = Edge.$,
		PropertyTween = Edge.PropertyTween,
		tweenTypes = { gradient: 0 },
		cssProp = "background-image",
		propLookup = { 'background-image': { cssProp: cssProp, def: "0px", u: "px", i: 1 } },
		prop,
		superApply = Edge._.p[cssProp].apply,
		superPrep = Edge._.p[cssProp].prep;

	// Helpers

	function forceGPU(ele) {
		if (document.documentElement.style.hasOwnProperty('webkitAppearance')) {
			var transform = $(ele).css('-webkit-transform');
			if (!transform.match(/translateZ/) && !transform.match(/matrix3d/)) {
				$(ele).css('-webkit-transform', transform + ' translateZ(0)');
			}
		}
	}
	Edge.forceGPU = forceGPU;

	function GradientTween(tweenType, property, elements, fromVal, val, opts) {
		var ci = null,
			i,
			lt,
			gt;
		if (val.length >= 2 && $.isArray(val[1]) && fromVal.length >= 2 && $.isArray(fromVal[1])) { // linear gradient
			ci = 1;
		} else if (val.length >= 2 && $.isArray(val[4]) && fromVal.length >= 2 && $.isArray(fromVal[4])) { // radial gradient
			ci = 4;
		}
		if (ci) {
			// Generate color stops when one of the tween ends has less than the other
			// Note:  For now, just duplicate the final color stop to get to the final set of colorstops.
			//        We might decide we need to interpolate values to get an approximate value at an interim position.
			lt = fromVal[ci].length < val[ci].length ? fromVal[ci] : val[ci];
			gt = lt === val[ci] ? fromVal[ci] : val[ci];

			for (i = lt.length; i < gt.length; i += 1) {
				lt[i] = lt[i - 1];
			}
		}
		Edge.PropertyTween.call(this, tweenType, property, elements, fromVal, val, opts);
		this.name = "GradientTween";
		this.tweenType = tweenTypes[tweenType];
	}

	$.extend(GradientTween.prototype, PropertyTween.prototype);
	$.extend(GradientTween.prototype, {

		constructor: GradientTween,

		setupForAnimation: function () {
			var elements = this.getElementSet();
			elements.each(function () {
				forceGPU(this);
			});

			PropertyTween.prototype.setupForAnimation.call(this);
		},
		getValue: function (prop, tt) {
			return $(this).css(prop);
		},
		setValuePre: function (tt, prop, val) {
			$(this).css(prop, '-webkit-' + val);
			$(this).css(prop, '-moz-' + val);
			$(this).css(prop, '-ms-' + val);
			$(this).css(prop, '-o-' + val);
		},
		setValue: function (tt, prop, val) {
			$(this).css(prop, val);
		},
		update: function (elapsed, easingConst) {
			var elements = this.getElementSet(),
				tween = this,
				tt = this.tweenType,
				i,
				fvs,
				tvs,
				filters,
				cnt,
				results;

			prop = propLookup[this.property].cssProp;

			if (!this.updateTriggered) {
				this.updateTriggered = true;
				this.setupForAnimation();
			}


			elements.each(function () {
				// We only want to tween if the property data has a
				// matching animation id. If the ids don't match, that
				// means another animation has started which is modifying
				// this same property.

				var td = tween.getPropertyTweenData(this, tt, tween.property),
					f,
					v,
					t,
					valPre,
					val;
				if (td.animationID !== tween.animationID) {
					return;
				}

				fvs = td.fromValues;
				tvs = td.toValues;
				filters = tween.filter;

				cnt = fvs.length;
				results = [];

				for (i = 0; i < cnt; i += 1) {
					f = fvs[i];
					t = tvs[i];
					v = undefined;
					if (typeof f === "string") {
						v = (easingConst === 0 && tween.duration > 0) ? f : t.value;
					} else {
						v = (f + ((t.value - f) * easingConst));
					}
					if (filters && filters[i]) {
						v = filters[i](v, tween, this, prop, t.unit, elapsed);
					}
					if (typeof v === "number" && v < 1) {
						// protect against exponential notation
						v = v.toFixed(6);
					}
					results.push(v + t.unit);
				}

				valPre = tween.formatValuePre(results);
				val = tween.formatValue(results);

				tween.setValuePre.call(this, tt, prop, valPre);
				tween.setValue.call(this, tt, prop, val);
				tween.notifyObservers("onUpdate", { elapsed: elapsed, easingConst: easingConst, property: prop, value: val, element: this });
			});

		},
		parseValue: function (val) {
			if (!val || val.length < 2) {
				return;
			}
			if (typeof val === "string") {
				val = JSON.parse(val);
			}
			function getStopPosition(colorstops, index) {
				if (colorstops[index].length > 1) {
					return colorstops[index][1];
				}

				var colorstopPosition;
				if (index === 0) { // If this color is the first color, then we know it's at position 0%
					colorstopPosition = 0;
				} else if (index === colorstops.length - 1) { // If this color is the last color, then we know it's at position 100%
					colorstopPosition = 100;
				} else { // If this color is in the middle, then we average the two adjacent stops
					colorstopPosition = (getStopPosition(colorstops, index - 1) + getStopPosition(colorstops, index + 1)) / 2;
				}
				colorstops[index].push(colorstopPosition);

				return colorstopPosition;
			}

			var angle = null,
				colorstops = null,
				centerPoint = null,
				ellipse = null,
				extent = null,
				colorstopValues = [],
				repeating = false,
				i,
				values = [],
				gradientValueObj,
				parsedColor;

			if ($.isArray(val[1])) { // Linear Gradient
				angle = val[0];
				colorstops = val[1];
				if (val[2]) {
					repeating = val[2];
				}
			} else { // Radial Gradient
				centerPoint = [val[0], val[1]];
				ellipse = val[2];
				extent = val[3];
				colorstops = val[4];
				if (val[5]) {
					repeating = val[5];
				}
			}

			for (i = 0; i < (colorstops.length); i += 1) {
				parsedColor = Edge.Color.parseValue(colorstops[i][0], i);
				if (parsedColor) {
					colorstopValues = colorstopValues.concat(parsedColor);
					colorstopValues.push(getStopPosition(colorstops, i));
				}
			}

			gradientValueObj = {angle: angle, colorstops: colorstopValues, centerPoint: centerPoint, ellipse: ellipse, extent: extent, repeating: repeating};

			if (!gradientValueObj || !gradientValueObj.colorstops) {
				return;
			}

			if (gradientValueObj.angle !== null) {
				values = values.concat(gradientValueObj.angle);
			} else if (gradientValueObj.centerPoint) {
				values = values.concat(gradientValueObj.centerPoint);
				values = values.concat([gradientValueObj.ellipse, gradientValueObj.extent]);
			}
			values = values.concat(gradientValueObj.colorstops);

			return values.concat(gradientValueObj.repeating);
		},
		formatValue: function (values) {
			return Edge.formatGradient(values, false);
		},
		formatValuePre: function (values) {
			return Edge.formatGradient(values, true);
		}
	});

	Edge.GradientTween = GradientTween;

	Edge.Gradient = { parseValue: GradientTween.prototype.parseValue };

	Edge.formatGradient = function (values, isPrefixed) {
		if (!values) {
			return;
		}
		var formattedValue = "",
			colorstopIndex = null,
			i,
			firstIndex,
			numberOfColors;

		if (values.length % 5 === 2) { // Linear Gradient
			// [0] - angle
			// [1-n]*5 - color stops
			colorstopIndex = 1;

			formattedValue += "linear-gradient(";
			formattedValue += (isPrefixed ? values[0] : (450 - values[0]) % 360) + 'deg,';
		} else { // values.length % 5 == 4 // Radial Gradient
			colorstopIndex = 4;
			formattedValue += "radial-gradient(";
			if (isPrefixed) {
				formattedValue += values[0] + "% " + values[1] + "%," + (values[2] == 1 ? "ellipse" : "circle") + " " + values[3] + ",";
			} else {
				formattedValue += values[3] + " " + (values[2] == 1 ? "ellipse" : "circle") + " at " + values[0] + "% " + values[1] + "%,";
			}
		}

		// repeating
		if (values[values.length - 1] == 1) {
			formattedValue = "repeating-" + formattedValue;
		}

		// Format color stops
		if (values.length < 12 || (values.length - colorstopIndex - 1) % 5 !== 0) { // 1 for the angle, 4 per color and 1 for the stop x 2 colors = 11
			return;
		}

		numberOfColors = Math.floor((values.length - colorstopIndex - 1) / 5);
		for (i = 0; i < numberOfColors; i += 1) {
			firstIndex = i * 5 + colorstopIndex;
			formattedValue += Edge.Color.formatValue(values.slice(firstIndex, firstIndex + 4)); // format the color using the color-tween formatting code
			if (values[firstIndex + 4] !== -1) {
				formattedValue += " " + values[firstIndex + 4] + '%';
			} // add the stop
			if (i !== numberOfColors - 1) {
				formattedValue += ',';
			}
		}
		formattedValue += ")"; // close the gradient function

		return formattedValue;
	};


	Edge.Timeline.addTweenType("gradient", function (prop, ele, fromVal, toVal, opts) {
		return new GradientTween("gradient", prop, ele, fromVal, toVal, opts);
	});

	// Monkey patch for Prop's prep and apply methods
	function applyProp($ele, val) {
		var parsedValue,
			formattedValue,
			formattedValueStandard;
		if (typeof val === 'string') {
			return superApply.call(Edge._.p[cssProp], $ele, val);
		}
		parsedValue = Edge.Gradient.parseValue(val);
		formattedValueStandard = Edge.formatGradient(parsedValue, false);
		formattedValue = Edge.formatGradient(parsedValue, true);

		$ele.css(cssProp, '-webkit-' + formattedValue);
		$ele.css(cssProp, '-moz-' + formattedValue);
		$ele.css(cssProp, '-ms-' + formattedValue);
		$ele.css(cssProp, '-o-' + formattedValue);
		$ele.css(cssProp, formattedValueStandard);
	}

	function prepProp($ele, oN, nm, i, j, ii, comp) {
		return (oN[nm] == undefined || typeof oN[nm][i] === 'string') ? superPrep.call(Edge._.p[cssProp], $ele, oN, nm, i, j, ii, comp) : oN[nm][i]; // the gradient definition object
	}


	Edge._.p[cssProp].apply = applyProp;
	Edge._.p[cssProp].prep = prepProp;

	for (prop in propLookup) {
		if (propLookup.hasOwnProperty(prop)) {
			Edge.Timeline.addTweenProperty(prop, "gradient");
		}
	}

})(window.AdobeEdge);