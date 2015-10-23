/// an.transform-tween.js - version 0.2 - An Release 2.0
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
 @name TransformTween
 @class Defines a tween that can separately animate the components of a CSS3 3d transform (later
 improvements are planned to support 2d transforms on browsers that don't support 3d). This defines a tween type of
 "transform' which permits the separate animation of the following transform properties:
 translateX, translateY, translateZ, rotateX, rotateY, rotateZ, skewX, skewY, scaleX, scaleY, and scaleZ.
 The individual component functions are combined in a single transform on each update, in the order just listed.
 */
/*jslint regexp: true */
(function (Edge) {
	"use strict";

	var $ = Edge.$,
		PropertyTween = Edge.PropertyTween,
		UpdateFinalizer = Edge.UpdateFinalizer,
		asin = Math.asin,
		sin = Math.sin,
		cos = Math.cos,
		tan = Math.tan,
		atan2 = Math.atan2,
		deg2Rad = Math.PI / 180.0,
		rad2Deg = 180.0 / Math.PI,
		i,
		sSubpropNames = 'translateX translateY translateZ scaleX scaleY rotateX rotateY rotateZ skewX skewY',
		subpropNames = sSubpropNames.split(' '),
		supported = Edge.supported = Edge.supported || {},
		TransformIdRoot = "transform_",
		TransformId = 1,
		canonOrder = {
			translate3d: 0,
			translate: 0,
			translateX: 0,
			translateY: 0,
			translateZ: 0,
			rotate: 1,
			rotateZ: 1,
			rotateX: 1,
			rotateY: 1,
			rotate3d: 1,
			skew: 2,
			skewX: 2,
			skewY: 2,
			scale3d: 3,
			scale: 3,
			scaleX: 3,
			scaleY: 3,
			scaleZ: 3,
			perspective: 4
		},
		isWebkit = 'webkitAppearance' in document.documentElement.style;;

	supported.cssTransform = Edge.isSupported(['transformProperty', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform']);
	supported.cssTransform3d = Edge.isSupported(['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective']);

	Edge.An$.prototype.hasClass = Edge.An$.prototype.hasClass || function (cls) {
		if (this[0]) {
			var className = this[0].className || "",
				classNames = className.split(/\s+/),
				i;
			for (i = 0; i < classNames.length; i += 1) {
				if (cls === classNames[i]) {
					return true;
				}
			}

		}
		return false;
	};
	// prop, ele, fromVal, toVal, opts
	function TransformTween(tweenType, property, elements, fromVal, val, opts) {
		Edge.PropertyTween.call(this, tweenType, property, elements, fromVal, val, opts);
		this.name = "transformTween";

	}

	TransformTween.removeData = function (ele) {
		var data = Edge.$.data(ele, TransformTween.dataName);
		if (data) {
			if (data.timeline) {
				UpdateFinalizer.unRegister(data.timeline, data.id);
			}
			Edge.$.data(ele, TransformTween.dataName, undefined);
		}
	};

	function getNumber(numWithUnits) {
		var num = 0;
		if (typeof numWithUnits === 'string') {
			num = parseFloat(numWithUnits.replace(/[a-zA-Z%]+$/, ""));
		} else if (typeof numWithUnits === 'number') {
			num = numWithUnits;
		}
		return num;
	}
	TransformTween.getNumber = getNumber;

	TransformTween.splitUnits = Edge.splitUnits;

	function formatNumber(num) {
		if (num !== 0 && Math.abs(num) < 1e-6) {
			return num.toFixed(6);
		}
		return num.toString();
	}

	function combineTranslation(parentDim, translate1, translate2) {
		if (translate1 === undefined) {
			return translate2;
		}
		if (translate2 === undefined) {
			return translate1;
		}
		var number1 = getNumber(translate1),
			number2 = getNumber(translate2),
			units1,
			units2,
			units;
		if (!number1) {
			return translate2;
		}
		if (!number2) {
			return translate1;
		}

		units1 = Edge.splitUnits(translate1).units;
		units2 = Edge.splitUnits(translate2).units;
		units = units1;

		if (units1 !== units2) {
			if (units1 === '%') {
				units = units2;
				number1 = number1 / 100 * parentDim;
			}
			if (units2 === '%') {
				number2 = number2 / 100 * parentDim;
			}
		}
		return number1 + number2 + units;
	}

	TransformTween.applyTransform = function (ele, data, tween, opts) {
		if (Edge.applyCount !== undefined) {
			Edge.applyCount += 1;
		}

		var $ele = $(ele),
			val,
			forceZ = true,
			prop = 'transform',
			translateX,
			translateY,
			supports3d,
			num,
			ua,
			rotateX,
			rotateY,
			rotateZ,
			scaleX,
			scaleY;

		if (opts) {
			forceZ = !opts.dontForceZ;
		}

		translateX = combineTranslation(1, data.translateX, data.motionTranslateX);
		translateY = combineTranslation(1, data.translateY, data.motionTranslateY);
		rotateZ = combineTranslation ( 1, data.rotateZ, data.motionRotateZ);
		
		supports3d = Edge.supported.cssTransform3d;

		if (isWebkit) {
			// Z transforms make some Android browsers sick, so don't write out unless necessary
			val = "translate(" + translateX + "," + translateY + ")";
			num = getNumber(data.translateZ);
			if ((num !== 0 || forceZ) && supports3d) {
				val += " translateZ(" + data.translateZ + ")";
			}
			val += " rotate(" + rotateZ + ") "; // don't call it rotateZ - android gets ill

			if (supports3d) {
				num = getNumber(data.rotateY);
				if (num !== 0) {
					val += " rotateY(" + data.rotateY + ")";
				}

				num = getNumber(data.rotateX);
				if (num !== 0) {
					val += " rotateX(" + data.rotateX + ")";
				}
			}

			if (data.skewX && data.skewX !== "0deg") {
				val += " skewX(" + data.skewX + ") ";
			}
			if (data.skewY && data.skewY !== "0deg") {
				val += " skewY(" + data.skewY + ") ";
			}

			val += " scale(" + data.scaleX + "," + data.scaleY + ") ";

			num = getNumber(data.scaleZ);
			if (num !== 1 && supports3d) {
				val += " scaleZ(" + data.scaleZ + ")";
			}

			ua = navigator.userAgent;

			// Don't do this in tool!
			if (!window.edge_authoring_mode && supports3d) {
				$ele.css('-webkit-transform-style', 'preserve-3d');
			}

			$ele.css('-webkit-transform', val);

			if (tween && tween.notifier.obs.length) {
				tween.notifyObservers("onUpdate", { elapsed: 0, easingConst: 0, property: prop, value: val, element: $ele[0] });
			}

		} else {
			rotateX = getNumber(data.rotateX);
			rotateY = getNumber(data.rotateY);
			scaleX = data.scaleX * cos(deg2Rad * rotateY);
			scaleY = data.scaleY * cos(deg2Rad * rotateX);

			val = "translate(" + translateX + "," + translateY + ")";
			val += " rotate(" + rotateZ + ")";
			if (data.skewX && data.skewX !== "0deg") {
				val += " skewX(" + data.skewX + ") ";
			}
			if (data.skewY && data.skewY !== "0deg") {
				val += " skewY(" + data.skewY + ") ";
			}
			val += " scale(" + scaleX + "," + scaleY + ")";

			$ele.css('-moz-transform', val);

			$ele.css('-o-transform', val);

			$ele.css('-ms-transform', val);// This is here in case MS changes ie9 for bug 8346

			$ele.css('msTransform', val); // work around jquery bug #8346 - IE9 uses wrong camel case
			if (tween && tween.notifier.obs.length) {
				tween.notifyObservers("onUpdate", { elapsed: 0, easingConst: 0, property: prop, value: val, element: $ele[0] });
			}
		}
		$ele.css("transform", val);
	};


	TransformTween.dataName = "EdgeTransformData";
	$.extend(TransformTween.prototype, PropertyTween.prototype);
	$.extend(TransformTween.prototype, {

		constructor: TransformTween,

		setup: function (timeline) {
			this.timeline = timeline;
			this.updateTriggered = false;
		},
		setValue: function (tt, prop, val) {
			var data = Edge.$.data(this, TransformTween.dataName);
			data[prop] = val;
		},
		getValue: function (prop, tt) {
			var data = Edge.$.data(this, TransformTween.dataName);
		},
		setupForAnimation: function () {
			var elements = this.getElementSet(),
				tween = this,
				data;
			elements.each(function () {
				//var $this = $(this);
				data = Edge.$.data(this, TransformTween.dataName);
				if (!data) {
					// Get the current values on the element and save
					data = tween.buildTransformData(this);
					Edge.$.data(this, TransformTween.dataName, data);
				}
			});

			PropertyTween.prototype.setupForAnimation.call(this);

		},
		update: function (elapsed, easingConst) {
			PropertyTween.prototype.update.call(this, elapsed, easingConst);
			var elements = this.getElementSet(),
				tween = this,
				prop = this.property,
				tt = this.tweenType;

			elements.each(function () {
				// We only want to tween if the property data has a
				// matching animation id. If the ids don't match, that
				// means another animation has started which is modifying
				// this same property.

				var td = tween.getPropertyTweenData(this, tt, prop),
					data;
				if (td.animationID !== tween.animationID) {
					return;
				}

				data = Edge.$.data(this, TransformTween.dataName);
				data.timeline = tween.timeline;
				data.tween = tween;
				UpdateFinalizer.Register(tween.timeline, data.id, data);
			});
		},
		buildTransformData: function (ele) {

			var data = Edge.parseCanonicalTransform(ele);
			if (!data) {
				data = {};
				data.translateX = "0px";
				data.translateY = "0px";
				data.translateZ = "0px";
				data.scaleX = 1;
				data.scaleY = 1;
				data.scaleZ = 1;
				data.rotateX = "0deg";
				data.rotateY = "0deg";
				data.rotateZ = "0deg";
				data.skewXZ = 0;
				data.skewXY = 0;
				data.skewYZ = 0;
				data.skewX = '0deg';
				data.skewY = '0deg';
				if (data.matrix) {
					delete data.matrix;
				}
			}
			if (data === null) {
				data = {};
			}

			data.id = TransformIdRoot + TransformId;
			TransformId += 1;
			data.element = ele;
			data.onFinalUpdate = UpdateFinalizer.prototype.applyTransform;

			return data;
		},
		buildDefaultTransformData: function (ele) {
			var data = {};
			data.translateX = "0px";
			data.translateY = "0px";
			data.translateZ = "0px";
			data.scaleX = 1;
			data.scaleY = 1;
			data.scaleZ = 1;
			data.rotateX = "0deg";
			data.rotateY = "0deg";
			data.rotateZ = "0deg";
			data.skewXZ = 0;
			data.skewXY = 0;
			data.skewYZ = 0;
			data.skewX = '0deg';
			data.skewY = '0deg';

			data.id = TransformIdRoot + TransformId;
			TransformId += 1;
			data.element = ele;
			data.onFinalUpdate = UpdateFinalizer.prototype.applyTransform;

			return data;
		}
		// End of TransformTween extend
	});

	function getTransform(ele) {
		var $ele = $(ele),
			style = $ele[0].style,
			xform;
		if (isWebkit) {
			xform = $ele[0].style.webkitTransform;
			if (!xform) {
				xform = $ele.css("-webkit-transform");
			}
		}

		if (xform) {
			return xform;
		}

		xform = $ele[0].style.msTransform;
		if (!xform) {
			xform = $ele.css("-ms-transform");
		}
		if (!xform) {
			xform = $ele.css("msTransform");
		}
		if (!xform) {
			xform = style.MozTransform;
		}
		if (!xform) {
			xform = style["-moz-transform"];
		}
		if (!xform) {
			xform = $ele.css("-moz-transform");
		}
		if (!xform) {
			xform = style.oTransform;
		}
		if (!xform) {
			xform = $ele.css("-o-transform");
		}
		if (!xform) {
			xform = style.transform;
		}
		if (!xform) {
			xform = $ele.css("transform");
		}

		return xform || "";
	}

	function parseCanonicalTransform(ele, xformString) {
		var xform = typeof xformString === 'string' ? xformString : Edge.getTransform(ele),
			re = /(\w+\s*\([^\)]*\))/g,
			funcs = xform.match(re),
			found = {},
			hiWater = 0,
			data = {},
			i,
			func,
			params,
			angle;

		if (!funcs) {
			return null;
		}

		data.translateX = "0px";
		data.translateY = "0px";
		data.translateZ = "0px";
		data.scaleX = 1;
		data.scaleY = 1;
		data.scaleZ = 1;
		data.rotateX = "0deg";
		data.rotateY = "0deg";
		data.rotateZ = "0deg";
		data.skewXZ = 0;
		data.skewXY = 0;
		data.skewYZ = 0;
		data.skewX = '0deg';
		data.skewY = '0deg';

		for (i = 0; i < funcs.length; i += 1) {
			func = funcs[i].match(/\w+/);
			if (found[func[0]] || canonOrder[func[0]] < hiWater) {
				return null;
			}
			params = funcs[i].match(/\([^\)]*\)/);
			params = params[0].replace(/[\(\)]/g, '');
			params = params.split(',');
			switch (func[0]) {
			case ('matrix'):
				return null;
			case ('translate3d'):
				data.translateX = params[0];
				data.translateY = params.length > 1 ? params[1] : '0px';
				data.translateZ = params.length > 2 ? params[2] : '0px';

				found.translate3d = found.translate = found.translateX = found.translateY = found.translateZ = true;
				break;
			case ('translate'):
				data.translateX = params[0];
				data.translateY = params.length > 1 ? params[1] : '0px';

				found.translate3d = found.translate = found.translateX = found.translateY = true;
				break;
			case ('translateX'):
				data.translateX = params[0];

				found.translate3d = found.translate = found.translateX = true;
				break;
			case ('translateY'):
				data.translateY = params[0];

				found.translate3d = found.translate = found.translateY = true;
				break;
			case ('translateZ'):
				data.translateZ = params[0];

				found.translate3d = found.translateZ = true;
				break;
			case ('rotate3d'):
				found.rotate3d = found.rotate = found.rotateX = found.rotateY = found.rotateZ = true;
				return null;
			case ('rotateX'):
				data.rotateX = params[0];
				found.rotate3d = found.rotateX = true;
				break;
			case ('rotateY'):
				data.rotateY = params[0];
				found.rotate3d = found.rotateY = true;
				break;
			case ('rotateZ'):
			case ('rotate'):
				data.rotateZ = params[0];
				found.rotate3d = found.rotate = found.rotateZ = true;
				break;
			case ('skew'):
				data.skewX = params[0];
				data.skewY = params.length > 1 ? params[1] : '0px';
				found.skew = found.skewX = found.skewY = true;
				break;
			case ('skewX'):
				data.skewX = params[0];
				found.skew = found.skewX = true;
				break;
			case ('skewY'):
				data.skewY = params[0];
				found.skew = found.skewY = true;
				break;
			case ('scale3d'):
				// Note that according to spec y and z default to 1 in scale3d, but y defaults to the x value in scale!
				data.scaleX = params[0];
				data.scaleY = params.length > 1 ? params[1] : 1;
				data.scaleZ = params.length > 2 ? params[2] : 1;

				found.scale3d = found.scale = found.scaleX = found.scaleY = found.scaleZ = true;
				break;
			case ('scale'):
				data.scaleX = params[0];
				data.scaleY = params.length > 1 ? params[1] : params[0];
				found.scale = found.scaleX = found.scaleY = true;
				break;
			case ('scaleX'):
				data.scaleX = params[0];
				found.scale3d = found.scale = found.scaleX = true;
				break;
			case ('scaleY'):
				data.scaleY = params[0];
				found.scale3d = found.scale = found.scaleY = true;
				break;
			case ('scaleZ'):
				data.scaleZ = params[0];
				found.scale3d = found.scaleZ = true;
				break;
			case ('perspective'):
				found.perspective = true;
				break;
			}
		}
		return data;
	}

	Edge.getTransform = getTransform;
	Edge.parseCanonicalTransform = parseCanonicalTransform;
	Edge.TransformTween = TransformTween;

	$.extend(UpdateFinalizer.prototype, {
		applyTransform: function (updateData) {
			// Note that this is called with 'this' set to the handler object
			var data = Edge.$.data(this.element, TransformTween.dataName);
			if (data && updateData) {
				TransformTween.applyTransform(this.element, data, data.tween, updateData.context);
			}
		}

	});

	/* transformSubprop is only here to work properly with use strict */
	function transformSubprop() {
	}

	transformSubprop.applySubprop = function ($ele, val) {
		var ele = $ele[0],
			prop = this.name,
			data = TransformTween.prototype.buildTransformData(ele);
		data[prop] = val;
		TransformTween.applyTransform(ele, data, null, {});
	};

	Edge.Timeline.addTweenType("transform", function (prop, ele, fromVal, toVal, opts) {
		return new TransformTween("transform", prop, ele, fromVal, toVal, opts);
	});

	for (i = 0; i < subpropNames.length; i += 1) {
		Edge.Timeline.addTweenProperty(subpropNames[i], 'transform');
	}

	//   subpropNames = 'translateX translateY translateZ scaleX scaleY rotateX rotateY rotateZ skewX skewY'

	Edge.defineProps({
		translateX: {
			f: 'transform',
			i: 0,
			j: 0,
			u: "px"
		},
		translateY: {
			f: 'transform',
			i: 0,
			j: 1,
			u: "px"
		},
		translateZ: {
			f: 'transform',
			i: 0,
			j: 2,
			u: "px"
		},
		// Notice that rotate is in the order [z, x, y] - this saves 4 bytes for the majority of usages
		rotateZ: {
			f: 'transform',
			i: 1,
			j: 0,
			u: "deg"
		},
		rotateX: {
			f: 'transform',
			i: 1,
			j: 1,
			u: "deg"
		},
		rotateY: {
			f: 'transform',
			i: 1,
			j: 2,
			u: "deg"
		},
		skewX: {
			f: 'transform',
			i: 2,
			j: 0,
			u: "deg"
		},
		skewY: {
			f: 'transform',
			i: 2,
			j: 1,
			u: "deg"
		},
		scaleX: {
			f: 'transform',
			i: 3,
			j: 0
		},
		scaleY: {
			f: 'transform',
			i: 3,
			j: 1
		},
		scaleZ: {
			f: 'transform',
			i: 3,
			j: 2
		}
	});

	/*jslint nomen: true */
	for (i = 0; i < subpropNames.length; i += 1) {
		Edge._.p[subpropNames[i]].apply = transformSubprop.applySubprop;
	}

})(window.AdobeEdge);