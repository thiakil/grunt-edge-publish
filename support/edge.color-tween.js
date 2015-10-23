/// edge.color-tween.js - version 0.2 - An Release 1.0
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
 @name ColorTween
 @class Defines a tween that can animate the background-color and color properties in rgb or hsl color space.
 This defines a tween type of "color' which can parse color properties in RGB or HSL css formats and convert them
 to the desired animation color space - HSL or RGB. (It is also planned to later support color names as css property
 values.
 */

(function (Edge) {

	"use strict";

	var $ = Edge.$,
		PropertyTween = Edge.PropertyTween,
		sPropNames = 'color background-color border-color',
		propNames = sPropNames.split(' '),
		i,
		supportTested = false,
		supportRGB = false,
		supportHSL = false,
		supportRGBA = false,
		supportHSLA = false,
		oneThird = 1.0 / 3.0,
		oneSixth = 1.0 / 6.0,
		twoThirds = 2.0 / 3.0;

	function testSupport() {
		if (!supportTested) {

			var ele = document.createElement("div"), $ele = $(ele),
				val,
				transparent;
			$ele.css("background-color", "transparent");
			transparent = $ele.css("background-color");
			$ele.css("background-color", "rgb(100, 100, 100)");
			val = $ele.css("background-color");
			supportRGB = val !== transparent;

			$ele.css("background-color", "transparent");
			$ele.css("background-color", "hsl(100, 100%, 100%)");
			val = $ele.css("background-color");
			supportHSL = val !== transparent;

			$ele.css("background-color", "transparent");
			$ele.css("background-color", "rgba(100, 100, 100,.5)");
			val = $ele.css("background-color");
			supportRGBA = val !== transparent;

			$ele.css("background-color", "transparent");
			$ele.css("background-color", "hsla(100, 100%, 100%, .5)");
			val = $ele.css("background-color");
			supportHSLA = val !== transparent;

			supportTested = true;
		}
	}

	function ColorTween(tweenType, property, elements, fromVal, val, opts) {
		Edge.PropertyTween.call(this, tweenType, property, elements, fromVal, val, opts);
		this.name = "colorTween";
		testSupport();
	}

	$.extend(ColorTween.prototype, PropertyTween.prototype);
	$.extend(ColorTween.prototype, {

		constructor: ColorTween,

		getValue: function (prop, tt) {
			return $(this).css(prop);
		},
		setValue: function (tt, prop, val) {
			$(this).css(prop, val);
		},
		parseValue: function (val) {
			var colorValueObj = Edge.parseColorValue(val),
				values,
				colorFn,
				patternRGB = /rgb/gi,
				patternHSL = /hsl/gi,
				valueRGB,
				valueHSL,
				opacity;

			if (!colorValueObj || !colorValueObj.colorFunction || !colorValueObj.values) {
				return;
			}

			values = colorValueObj.values;

			colorFn = colorValueObj.colorFunction;

			if (colorFn.match(patternRGB)) {
				if (this.animationColorSpace && this.animationColorSpace === 'HSL') {
					valueRGB = {r: values[0], g: values[1], b: values[2]};
					valueHSL = Edge.rgbToHSL(valueRGB);
					if (!valueHSL) {
						values = [];
					} else if (values.length > 3) {
						opacity = values[3];
						values = [valueHSL.h, valueHSL.s, valueHSL.l, opacity];
					} else {
						values = [valueHSL.h, valueHSL.s, valueHSL.l];
					}
				} else if (!this.animationColorSpace) {
					this.animationColorSpace = 'RGB';
				} else if (this.animationColorSpace !== 'RGB') {
					//Unexpected value, Not yet implemented
					return values;
				}
			} else if (colorFn.match(patternHSL)) { //HSL
				if (this.animationColorSpace && this.animationColorSpace === 'RGB') {
					valueHSL = {h: values[0], s: values[1], l: values[2]};
					valueRGB = Edge.hslToRGB(valueHSL);
					if (!valueRGB) {
						values = [];
					} else if (values.length > 3) {
						opacity = values[3];
						values = [valueRGB.r, valueRGB.g, valueRGB.b, opacity];
					} else {
						values = [valueRGB.r, valueRGB.g, valueRGB.b];
					}
				} else if (!this.animationColorSpace) {
					this.animationColorSpace = 'HSL';
				} else if (this.animationColorSpace !== 'HSL') {
					//Unexpected value, Not yet implemented
					return values;
				}

			}

			if (values.length === 3) {
				values[3] = 1; // Normalize to rgba or hsla, set the opacity to 1
			}

			return values;
		},
		formatValue: function (values) {
			testSupport();
			if (!values) {
				return;
			}

			var formattedValue,
				colorFn,
				val,
				r,
				g,
				b,
				rgb;
			if (this.animationColorSpace === 'HSL' && supportHSLA) {
				colorFn = 'hsl';
				if (values.length === 4 && supportHSLA) {
					formattedValue = colorFn + 'a(' + values[0] + ',' + values[1] + '%,' + values[2] + '%,' + values[3] + ')';
				} else {
					formattedValue = colorFn + '(' + values[0] + ',' + values[1] + '%,' + values[2] + '%)';
				}
			} else if (supportRGBA) {
				colorFn = 'rgb';
				if (values.length === 4 && supportRGBA) {
					formattedValue = colorFn + 'a(' + values[0] + '%,' + values[1] + '%,' + values[2] + '%,' + values[3] + ')';
				} else {
					formattedValue = colorFn + '(' + values[0] + '%,' + values[1] + '%,' + values[2] + '%)';
				}
			} else {
				// Downlevel support
				r = values[0];
				g = values[1];
				b = values[2];
				if (this.animationColorSpace === 'HSL') {
					rgb = Edge.hslToRGB({h: values[0], g: values[1], b: values[2]});
					r = rgb.r;
					g = rgb.g;
					b = rgb.b;
				}
				r *= 255 / 100;
				g *= 255 / 100;
				b *= 255 / 100;
				val = Math.floor(r) * 256 * 256 + Math.floor(g) * 256 + Math.floor(b);
				formattedValue = "#" + val.toString(16);
			}
			return formattedValue;
		}
	});

	Edge.ColorTween = ColorTween;

	Edge.Color = { formatValue: ColorTween.prototype.formatValue, parseValue: ColorTween.prototype.parseValue };

	Edge.parseColorValue = function (val) {
		if (!val) {
			return;
		}

		var values = [],

			colorFn,
			params,
		// Tests for #ffffff
			colorExpHex6 = /^\s*#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})\s*$/,
		// Tests for #fff
			colorExpHex3 = /^\s*#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])\s*$/,
			patternRGB = /rgb/gi,
			patternHSL = /hsl/gi,
			i,
			splitParams,
			colorValueObj;

		params = colorExpHex6.exec(val);
		if (params) {
			values = [((parseInt(params[1], 16)) / 255) * 100, ((parseInt(params[2], 16)) / 255) * 100, ((parseInt(params[3], 16)) / 255) * 100];
			colorFn = 'rgb';
		} else {
			params = colorExpHex3.exec(val);
			if (params) {
				values = [((parseInt(params[1] + params[1], 16)) / 255) * 100, ((parseInt(params[2] + params[2], 16)) / 255) * 100, ((parseInt(params[3] + params[3], 16)) / 255) * 100];
				colorFn = 'rgb';
			} else if (val === "transparent") {
				values = [0, 0, 0, 0];
				colorFn = 'rgb';
			}
		}

		if (!colorFn) {
			colorFn = val.toString().match(/\w+/);
			if ($.isArray(colorFn)) {
				colorFn = colorFn[0];
			} else if (!colorFn) {
				colorFn = "";
			}

			params = val.toString().match(/\([\d%,\.\s]*\)/);
			if (params && params.length > 0) {
				params = params[0].replace(/[\(\)]/g, '');
			}
		}

		if (values.length === 0) {
			if (colorFn.match(patternRGB)) {
				//Tests for % or ints
				// Test for numbers
				splitParams = /^\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*(?:,\s*([0-9](?:\.[0-9]+)?)\s*)?$/.exec(params);
				if (splitParams && splitParams.length >= 4) {
					for (i = 0; i < 3; i += 1) {
						// if the number is an integer (from 0 -255) normalize to percent
						values[i] = (splitParams[i + 1] / 255) * 100;
					}
					if (splitParams.length > 4) {
						if (!splitParams[4]) {
							splitParams[4] = 1;
						}
						values[3] = splitParams[4]; // opacity
					}
				} else {
					// Tests for float %
					params = /^\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*%\s*,\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*%\s*,\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*%\s*(?:,\s*([0-9](?:\.[0-9]+)?)\s*)?$/.exec(params);
					if (params && params.length >= 4) {
						/// Get rid of any unnecessary data captured
						if (params.length >= 5) {
							params.length = 5;
							if (!params[4]) {
								params[4] = 1;
							}
						}
						for (i = 0; i < (params.length - 1); i += 1) {
							// if the number is a percentage copy it as is
							values[i] = params[i + 1];
						}
					}
				}
			} else if (colorFn.match(patternHSL)) { //HSL
				params = /^\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*,\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*%\s*,\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*%\s*(?:,\s*([0-9](?:\.[0-9]+)?)\s*)?$/.exec(params);
				if (params && params.length >= 4) {
					/// Get rid of any unnecessary data captured
					if (params.length >= 5) {
						params.length = 5;
						if (!params[4]) {
							params[4] = 1;
						}
					}
					for (i = 0; i < (params.length - 1); i += 1) {
						values[i] = params[i + 1];
					}
				}
			}
		}

		// Round to 4 decimal places
		if (values) {
			for (i = 0; i < values.length; i += 1) {
				values[i] = (Math.round(values[i] * 10000)) / 10000;
			}
		}

		colorValueObj = {colorFunction: colorFn, values: values};

		return colorValueObj;
	};


	function normalizeColorComponent(c) {
		if (c < 0.0) {
			return c + 1.0;
		}
		if (c > 1) {
			return c - 1.0;
		}
		return c;

	}

	function rgbComponentFromIntermediate(p, q, multiplier, tC) {
		if (tC < oneSixth) {
			return p + multiplier * tC;
		}
		if (tC < 0.5) {
			return q;
		}
		if (tC < twoThirds) {
			return p + multiplier * (twoThirds - tC);
		}
		return p;
	}

	/** @name hslToRGB
	 Assumes hsl values as (deg, %, %). Returns rgb as percentage
	 */
	Edge.hslToRGB = function (hsl) {
		if (hsl === null || hsl.s < 0 || hsl.s > 100 || hsl.l < 0 || hsl.l > 100) {
			return null;
		}

		// Normalize the hue
		while (hsl.h > 360) {
			hsl.h = hsl.h - 360;
		}

		while (hsl.h < 0) {
			hsl.h = 360 + hsl.h;
		}

		var rgb = {},
			h = hsl.h / 360,
			s = hsl.s / 100,
			l = hsl.l / 100,
			q,
			p,
			tR,
			tG,
			tB,
			multiplier;

		if (s === 0) {
			rgb.r = rgb.g = rgb.b = l;
		} else {
			if (l <= 0.5) {
				q = l * (1 + s);
			} else {
				q = l + s - (l * s);
			}

			p = 2.0 * l - q;

			tR = normalizeColorComponent(h + oneThird);
			tG = normalizeColorComponent(h);
			tB = normalizeColorComponent(h - oneThird);

			multiplier = (q - p) * 6.0;

			rgb.r = rgbComponentFromIntermediate(p, q, multiplier, tR);
			rgb.g = rgbComponentFromIntermediate(p, q, multiplier, tG);
			rgb.b = rgbComponentFromIntermediate(p, q, multiplier, tB);
		}

		rgb.r = Math.min(rgb.r * 100, 100);
		rgb.g = Math.min(rgb.g * 100, 100);
		rgb.b = Math.min(rgb.b * 100, 100);

		// Round to 4 decimal places
		rgb.r = (Math.round(rgb.r * 10000)) / 10000;
		rgb.g = (Math.round(rgb.g * 10000)) / 10000;
		rgb.b = (Math.round(rgb.b * 10000)) / 10000;

		return rgb;
	};

	/** @name rgbToHSL
	 Assumes rgb values as a percentage. Returns hsl as (deg, %,%)
	 */
	Edge.rgbToHSL = function (rgb) {
		if (rgb === null || rgb.r < 0 || rgb.r > 100 || rgb.g < 0 || rgb.g > 100 || rgb.b < 0 || rgb.b > 100) {
			return null;
		}

		var hsl = {h: 0, s: 0, l: 0 },
			r = rgb.r / 100,
			g = rgb.g / 100,
			b = rgb.b / 100,
			maxColor = Math.max(r, g, b),
			minColor = Math.min(r, g, b),
			colorDiff;

		hsl.l = (maxColor + minColor) / 2.0;

		// If the max and min colors are the same (ie the color is some kind of grey), S is defined to be 0,
		// and H is undefined but in programs usually written as 0
		if (maxColor > minColor && hsl.l > 0.0) {
			colorDiff = maxColor - minColor;
			if (hsl.l <= 0.5) {
				hsl.s = colorDiff / (maxColor + minColor);
			} else {
				hsl.s = colorDiff / (2.0 - maxColor - minColor);
			}

			if (maxColor === b) {
				hsl.h = 4.0 + (r - g) / colorDiff;
			} else if (maxColor === g) {
				hsl.h = 2.0 + (b - r) / colorDiff;
			} else {  // maxColor == r
				hsl.h = (g - b) / colorDiff;
			}

			// Normalize hue
			hsl.h *= 60;
			if (hsl.h > 360) {
				hsl.h = hsl.h - 360;
			} else if (hsl.h < 0) {
				hsl.h = 360 + hsl.h;
			}
		}

		hsl.s = Math.min(hsl.s * 100, 100);
		hsl.l = Math.min(hsl.l * 100, 100);

		// Round to 4 decimal places
		hsl.h = (Math.round(hsl.h * 10000)) / 10000;
		hsl.s = (Math.round(hsl.s * 10000)) / 10000;
		hsl.l = (Math.round(hsl.l * 10000)) / 10000;

		return hsl;
	};

	Edge.colorToSupported = function (val) {
		testSupport();
		if ((!supportRGBA && /rgba/.test(val)) || (!supportRGB && /rgb/.test(val)) || (!supportHSLA && /hsla/.test(val)) || (!supportHSL && /hsl/.test(val))) {
			// Downlevel support
			var result = Edge.parseColorValue(val), values = result.values,
				r,
				g,
				b,
				rgb;
			if (values.length >= 4 && values[3] < 0.5) {
				return 'transparent';
			}
			r = values[0];
			g = values[1];
			b = values[2];
			if (/hsl/.test(val)) {
				rgb = Edge.hslToRGB({h: values[0], g: values[1], b: values[2]});
				r = rgb.r;
				g = rgb.g;
				b = rgb.b;
			}
			r *= 255 / 100;
			g *= 255 / 100;
			b *= 255 / 100;
			r = Math.floor(r);
			g = Math.floor(g);
			b = Math.floor(b);
			r = (r > 15 ? "" : "0") + r.toString(16);
			g = (g > 15 ? "" : "0") + g.toString(16);
			b = (b > 15 ? "" : "0") + b.toString(16);
			val = "#" + r + g + b;
		}
		return val;
	};

	Edge.Timeline.addTweenType("color", function (prop, ele, fromVal, toVal, opts) {
		return new ColorTween("color", prop, ele, fromVal, toVal, opts);
	});

	for (i = 0; i < propNames.length; i += 1) {
		Edge.Timeline.addTweenProperty(propNames[i], 'color');
	}
})(window.AdobeEdge);