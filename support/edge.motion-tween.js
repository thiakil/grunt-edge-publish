/// Edge.motion-tween.js - version 0.2 - Edge Release 1.0
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
 @name MotionTween
 @class Defines a tween that can animate an object along a path described by a cubic spline
 */

/*jslint plusplus: true */
/*global window: true */
/*global document: true */
(function (Edge) {
	"use strict";

	var $ = Edge.$,
		PropertyTween = Edge.PropertyTween,
		TransformTween = Edge.TransformTween,
		UpdateFinalizer = Edge.UpdateFinalizer;

	function originIncludesBorders() {
		var ele = document.createElement('div'),
			ele$ = $(ele),
			sOrigin,
			sOrigin2;
		if (document.body !== null) {
			document.body.appendChild(ele);
		}
		ele$.css("left", "-9999px").css("width", "100px");
		ele$.css("transform-origin", "50% 50%").css("-webkit-transform-origin", "50% 50%").css("-moz-transform-origin", "50% 50%").css("-ms-transform-origin", "50% 50%").css("-o-transform-origin", "50% 50%");

		sOrigin = ele$.css("transform-origin") || ele$.css("-webkit-transform-origin") || ele$.css("-moz-transform-origin") || ele$.css("-ms-transform-origin") || ele$.css("-o-transform-origin");
		ele$.css("border-width", "10px").css("border-style", "solid");
		sOrigin2 = ele$.css("transform-origin") || ele$.css("-webkit-transform-origin") || ele$.css("-moz-transform-origin") || ele$.css("-ms-transform-origin") || ele$.css("-o-transform-origin");

		if (ele.parentNode !== null) {
			ele.parentNode.removeChild(ele);
		}

		return sOrigin !== sOrigin2;
	}

	function MotionTween(tweenType, property, elements, path, keyframes, opts) {
		TransformTween.call(this, tweenType, 'motion', elements, undefined, undefined, opts);

		this.name = "motionTween";
		this.path = path;
		if (path && path.length > 1 && path[0].length < 6) {
			path[0][4] = path[0][5] = 0; // append lowerdx
			path[path.length - 1].splice(2, 0, 0, 0); // insert upperdx
		}
		this.keyframes = [];

		this.originIncludesBorders = originIncludesBorders();
	}

	function formatNumber(num) {
		if (num !== 0 && Math.abs(num) < 1e-6) {
			return num.toFixed(6);
		}
		return num.toString();
	}

	function cubic(s0, s1, b) {
		// see http://en.wikipedia.org/wiki/Hermite_curve
		// s = { x, y, upperdx/db, upperdy/db, lowerdx/db, lowerdy/db }
		try {
			if (s0[0] === s1[0] && s0[1] === s1[1]) {
				return { x: s1[0], y: s1[1] };
			}
		} catch (e) {
			//debugger;
		}

		var o = {},
			b2 = b * b,
			b3 = b2 * b,
			h00 = 2 * b3 - 3 * b2 + 1,
			h10 = b3 - 2 * b2 + b,
			h01 = -2 * b3 + 3 * b2,
			h11 = b3 - b2;
		/*  For comparison to article ref'd above:
			x0 = s0[0]
			y0 = s0[1]
			x1 = s1[0]
			y1 = s1[1]
			m0x = s0[2];
			m0y = s0[3];
			m1x = s1[4];
			m1y = s1[5];
		 */
		o.x = h00 * s0[0] + h10 * s0[2] + h01 * s1[0] + h11 * s1[4];
		o.y = h00 * s0[1] + h10 * s0[3] + h01 * s1[1] + h11 * s1[5];
		return o;
	}

	function derivative(s0, s1, b) {

		// see http://en.wikipedia.org/wiki/Hermite_curve
		// LUA: s = { t, x, y, udx/dt, udy/dt, lowerdx, lowerdy }
		// s = { x, y, upperdx/db, upperdy/db, lowerdx/db, lowerdy/db }

		if (s0[0] === s1[0] && s0[1] === s1[1]) {
			return { dx: 0, dy: 0};
		}

		var o = {},
			b2 = b * b,
			h00 = 6 * b2 - 6 * b,
			h10 = 3 * b2 - 4 * b + 1,
			h01 = -6 * b2 + 6 * b,
			h11 = 3 * b2 - 2 * b,
			m0x = s0[2],
			m0y = s0[3],
			m1x = s1[4],
			m1y = s1[5];

		o.dx = h00 * s0[0] + h10 * m0x + h01 * s1[0] + h11 * m1x;
		o.dy = h00 * s0[1] + h10 * m0y + h01 * s1[1] + h11 * m1y;
		return o;
	}

	function distance2(pt1, pt2) {
		var dx = pt1.x - pt2.x,
			dy = pt1.y - pt2.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	function dot2(pt1, pt2) {
		return pt1.x * pt2.x + pt1.y * pt2.y;
	}

	function refinePoints(s0, s1, points, startIndex, tolerance) {
		var baseB = Math.floor(points[startIndex].b),
			b = (points[startIndex].b + points[startIndex + 1].b) / 2 - baseB,
			val = cubic(s0, s1, b),
			linearPoint = {x : (points[startIndex].x + points[startIndex + 1].x) / 2, y : (points[startIndex].y + points[startIndex + 1].y) / 2},
			inserted = 0;

		if (distance2(linearPoint, val) > tolerance) {
			// subdivide and recurse
			val.b = b + baseB;
			points.splice(startIndex + 1, 0, val);
			inserted = refinePoints(s0, s1, points, startIndex + 1, tolerance);
			inserted = inserted + refinePoints(s0, s1, points, startIndex, tolerance) + 1;
		}
		return inserted;
	}

	function createEasingTable(points) {
		//console.log("createEasingTable called")
		// convert points of a curve in (0,0)-(1,1) to be a lookup table from t to easing value
		var minStep = 1, i, t, numSteps, step, easingTable, index, e;

		for (i = 0; i < points.length - 1; i++) {
			if (points[i + 1].x - points[i].x > 0) {
				minStep = Math.min(minStep, points[i + 1].x - points[i].x);
			}
		}
		numSteps = Math.ceil(1 / minStep);
		step = 1 / numSteps;
		easingTable = [];
		index = 0;

		easingTable[0] = {t : 0, e : 0};

		for (i = 0; i < numSteps; i++) {
			t = i * step;
			while (t > points[index + 1].x && index < points.length - 2) {
				index++;
			}
			e = points[index + 1].y;
			if ((points[index + 1].x - points[index].x) > 0) {
				e = points[index].y + (t - points[index].x) * (points[index + 1].y - points[index].y) / (points[index + 1].x - points[index].x);
			}
			easingTable[i] = {t : t, e : e};
			// compare to easeinoutquad
			//easingTable[i + 1].eioq = Easing.easeInOutQuad(t, t, 0, 1, 1)
		}
		if (easingTable[easingTable.length - 1].t < 1) {
			easingTable[easingTable.length] = {t : 1, e : 1};
		}
		return easingTable;
	}

	function isStraightLine(points, toleranceInRadians) {
		var len = distance2(points[points.length - 1], points[0]),
			i,
			pt1,
			dot,
			denom,
			pt2 = {x: points[points.length - 1].x - points[0].x, y: points[points.length - 1].y - points[0].y};
		for (i = 1; i < points.length - 1; i++) {
			pt1 = {x: points[i].x - points[0].x, y: points[i].y - points[0].y};
			dot = dot2(pt1, pt2);
			denom = len * distance2(points[i], points[0]);
			if (Math.abs(Math.acos(dot / denom)) > toleranceInRadians) {
				return false;
			}
		}
		return true;
	}

	function setUpEasings(aKfs) {
		var i, j, k, s0, s1, points, b, o, val;
		for (i = 0; i < aKfs.length - 1; i++) {
			// convert from bezier to hermite
			s0 = [0, 0, aKfs[i].upper.x * 3, aKfs[i].upper.y * 3, aKfs[i].lower.x * 3, aKfs[i].lower.y * 3];
			s1 = [1, 1, aKfs[i + 1].upper.x * 3, aKfs[i + 1].upper.y * 3, (1 - aKfs[i + 1].lower.x) * 3, (1 - aKfs[i + 1].lower.y) * 3];
			points = [];

			for (j = 0; j < 5; j++) {
				b = j / 4;
				o = { b: b };
				val = cubic(s0, s1, b);
				o.x = val.x;
				o.y = val.y;
				o.b = b;
				points[j] = o;
			}
			if (isStraightLine(points, 0.005)) {
				// discard unneeded intermediate points
				points.splice(1, 3);
			} else {
				for (j = 0; j < 4; j++) {
					k = 3 - j;
					refinePoints(s0, s1, points, k, 0.01);
				}
			}
			aKfs[i].easingTable = createEasingTable(points);
		}
	}

	$.extend(MotionTween.prototype, TransformTween.prototype);
	$.extend(MotionTween.prototype, {

		constructor: MotionTween,

		/*setValue: use the inherited one from TransformTween */
		getValue: function (prop, tt) {
		},
		setupForAnimation: function () {
			//this.duration = this.path[this.path.length-1][0];
			TransformTween.prototype.setupForAnimation.call(this);
			if (!this.points) {
				this.setUpPoints();
				this.setUpLen2bMap();
				setUpEasings(this.keyframes);
			}

			if (!this.deltas && !window.edge_authoring_mode) {
				this.getElementSet().each(function () {
					var $this = $(this),
						propX = Edge.$.data(this, "p_x") || "left",
						propY = Edge.$.data(this, "p_y") || "top",
						parentEle = this.parentElement,
						$parent = $(parentEle),
						deltaX = +parseFloat($this.css(propX)) || 0,
						deltaY = +parseFloat($this.css(propY)) || 0;

					if (Edge.$.data(this, "u_x") === "%") {
						deltaX = (deltaX / 100) * +$parent.width();
					}
					if (Edge.$.data(this, "u_y") === "%") {
						deltaY = (deltaY / 100) * +$parent.height();
					}

					Edge.$.data(this, "deltaX", deltaX);
					Edge.$.data(this, "deltaY", deltaY);
					$this.css(propX, "0px").css(propY, "0px");
				});
				this.deltas = true;
			}

			var firstT = this,
				dxy0;

			while (firstT._prevObj) {
				//ignore "filler" transitions
				if (firstT._prevObj.path.length == 2 && (firstT._prevObj.path[0][0] === firstT._prevObj.path[1][0] && firstT._prevObj.path[0][1] === firstT._prevObj.path[1][1])) {
					break;
				}
				firstT = firstT._prevObj;
			}

			dxy0 = derivative(firstT.path[0], firstT.path[1], 0.000001);
			this.deltaRotate = Math.atan2(dxy0.dx, dxy0.dy) * 180 / Math.PI;

		},
		computeEasing: function (ms) {
			var aKfs = this.keyframes,
				t = ms / this.getDuration(),
				index = 0,
				i,
				easingTable,
				segLen,
				segDuration,
				tableIndex,
				e;

			for (i = 0; i < aKfs.length - 1; i++) {
				index = i;
				if (t <= aKfs[i + 1].t) {
					break;
				}
			}
			easingTable = aKfs[index].easingTable;
			segLen = aKfs[index + 1].l - aKfs[index].l;
			segDuration = aKfs[index + 1].t - aKfs[index].t;

			// lookup e in the table, interpolating linearly
			t = (t  - aKfs[index].t) / segDuration;
			tableIndex = Math.floor(t / (easingTable[1].t - easingTable[0].t));
			tableIndex = Math.min(easingTable.length - 2, Math.max(tableIndex, 0));
			// e is easing per segment
			e = easingTable[tableIndex].e + (t - easingTable[tableIndex].t) * (easingTable[tableIndex + 1].e - easingTable[tableIndex].e) / (easingTable[tableIndex + 1].t - easingTable[tableIndex].t);
			return aKfs[index].l + e * segLen;
		},
		originInPx: function (ele$) {

			var sOrigin,
				aOrigin,
				oOrigin = {},
				w = ele$.width(),
				h = ele$.height(),
				bdlW,
				bdtW,
				originXp,
				originYp;
			sOrigin = ele$.css("transform-origin") || ele$.css("-webkit-transform-origin") || ele$.css("-moz-transform-origin") || ele$.css("-ms-transform-origin") || ele$.css("-o-transform-origin") || "50% 50%";

			aOrigin = sOrigin.split(" ");
			if (aOrigin[0].indexOf("%") > 0) {
				originXp = parseFloat(aOrigin[0].substring(0, aOrigin[0].length - 1)) / 100;
				originYp = parseFloat(aOrigin[1].substring(0, aOrigin[1].length - 1)) / 100;
				oOrigin.x = w * originXp;
				oOrigin.y = h * originYp;
			} else {
				//already in pixels...
				oOrigin.x = parseFloat(aOrigin[0].substring(0, aOrigin[0].length - 2));
				oOrigin.y = parseFloat(aOrigin[1].substring(0, aOrigin[1].length - 2));
			}

			if (!this.originIncludesBorders) {
				originXp = originXp || oOrigin.x / w;
				originYp = originYp || oOrigin.y / h;

				//adjust for border
				bdlW = Edge.splitUnits(ele$.css("border-left-width")).num + Edge.splitUnits(ele$.css("border-right-width")).num || 0;
				bdlW = bdlW * originXp;
				bdtW = Edge.splitUnits(ele$.css("border-top-width")).num + Edge.splitUnits(ele$.css("border-bottom-width")).num || 0;
				bdtW = bdtW * originYp;
				oOrigin.x += bdlW;
				oOrigin.y += bdtW;
			}

			return oOrigin;
		},

		update: function (elapsed, easingConst, context) {

			if (!this.updateTriggered) {
				this.updateTriggered = true;
				this.setupForAnimation(context);
			}

			var elements = this.getElementSet(context),
				tween = this,
				prop = this.property,
				tt = this.tweenType,
				e = easingConst,
				seg = this.findSegment(e),
				path = this.path,
				b = this.easeToB(e),
				len = this.points[this.points.length - 1].l,
				deltaB,
				angle,
				overshoot;

			b = b - seg;
			b = Math.min(1.0, Math.max(0, b));
			deltaB = Math.max(0.000001, Math.min(0.999999, b));

			var o = cubic(path[seg], path[seg + 1], b),
				deltaXY = derivative(path[seg], path[seg + 1], deltaB),
				rotation1 = Math.atan2(deltaXY.dx, deltaXY.dy) * 180 / Math.PI,
				rotation,
				skipRotation;

			if (this._prevObj && path.length === 2 && path[0][0] === path[1][0] && path[0][1] === path[1][1]) {
				skipRotation = true;
				rotation = 0;//we don't know what it really is, this path shouldn't change it
			} else {
				rotation = (this.deltaRotate - rotation1);
			}

			if (e < 0 || e > 1) {
				angle = Math.atan2(deltaXY.dy, deltaXY.dx);
				overshoot = (e > 1) ? e - 1 : e;
				o.x += Math.cos(angle) * len * overshoot;
				o.y += Math.sin(angle) * len * overshoot;
			}

			elements.each(function () {
				// We only want to tween if the property data has a
				// matching animation id. If the ids don't match, that
				// means another animation has started which is modifying
				// this same property.

				var $this = $(this),
					oOrigin,
					td = tween.getPropertyTweenData(this, tt, prop),
					data = Edge.$.data(this, TransformTween.dataName),
					parentEle = this.parentElement,
					$parent,
					parentW,
					parentH;

				data.tween = tween;

				if (td.animationID !== tween.animationID) {
					return;
				}

				oOrigin = tween.originInPx($this);

				//step 1: calculate the offset of the origin point from the corner
				var propX = Edge.$.data(this, "p_x") || "left",
					propY = Edge.$.data(this, "p_y") || "top",
					valX = o.x,
					valY = o.y,
					uX = Edge.$.data(this, "u_x") || "px",
					uY = Edge.$.data(this, "u_y") || "px",
					deltaX = /*Edge.$.data(this, "deltaX") ||*/ 0,
					deltaY = /*Edge.$.data(this, "deltaY") ||*/ 0,
					//pushToTranslate = !window.edge_authoring_mode || !Edge.$.data(this, "domDef"),
					pushToTranslate = !window.edge_authoring_mode,
					doAutoRotate = Edge.$.data(this, "doAutoOrient");

				doAutoRotate = doAutoRotate === "true" ? true : doAutoRotate === "false" ? false : doAutoRotate;

				if (pushToTranslate) {

					$parent = $(parentEle);
					parentW = $parent.width();
					parentH = $parent.height();

				//if in % then we need to calculate value in px
					if (uX === "%") {
						valX = (valX / 100.0) * parentW;
					}
					if (uY === "%") {
						valY = (valY / 100.0) * parentH;
					}
				}

				valX = valX + (propX === "right" ? oOrigin.x : -1 * oOrigin.x);
				valY = valY + (propY === "bottom" ? oOrigin.y : -1 * oOrigin.y);

				if (pushToTranslate) {
					valX = valX + deltaX;
					valY = valY + deltaY;
				}

				valX = formatNumber(valX);
				valY = formatNumber(valY);

				if (!skipRotation) {
					if (!doAutoRotate) {
						rotation = 0;
					}
					rotation = Math.abs(rotation) > .01 ? rotation: 0; // Handle tiny numbers that might go to exp notation

					Edge.$.data(this, "motionRotateZ", rotation + "deg");
					tween.setValue.call(this, undefined, "motionRotateZ", rotation + "deg");
					UpdateFinalizer.Register(tween.timeline, data.id, data);
				}

				if (!pushToTranslate) {
					$(this).css(propX, valX + uX);
					tween.notifyObservers("onUpdate", { elapsed: elapsed, easingConst: easingConst, property: propX, value: valX + uX, element: data.tween });
					$(this).css(propY, valY + uY);
					tween.notifyObservers("onUpdate", { elapsed: elapsed, easingConst: easingConst, property: propY, value: valY + uY, element: this });
				} else {
					tween.setValue.call(this, undefined, "motionTranslateX", valX + "px");
					tween.setValue.call(this, undefined, "motionTranslateY", valY + "px");
					UpdateFinalizer.Register(tween.timeline, data.id, data);
				}
			});

		},
		findSegment : function (e) {
			var b = this.len2b(e * this.points[this.points.length - 1].l);
			b = Math.floor(b);
			return Math.min(Math.max(b, 0), this.path.length - 2);
		},
		// Return the b value for whole curve
		easeToB : function (e) {
			return this.len2b(e * this.points[this.points.length - 1].l);
		},
		setUpLen2bMap : function () {
			var len = 0,
				i,
				index = 0,
				totalLength,
				numTicks = (this.getDuration() * 60) / 1000.0,
				lenPerTick,
				len2bMap = this.len2bMap = [],
				points = this.points,
				b;

			for (i = 0; i < points.length - 1; i++) {
				points[i].l = len;
				len = len + distance2(points[i], points[i + 1]);
			}
			points[points.length - 1].l = len;
			totalLength = len;
			lenPerTick = totalLength / numTicks;
			this.len2bStep = lenPerTick;

			len = 0;
			i = 0;
			if (totalLength > 0) {
				while (len <= totalLength) {
					while (i < points.length - 1 && len > points[i + 1].l) {
						i = i + 1;
					}
					if (i >= points.length - 1) {
						break;
					}
					// assume samples are dense enough to do linear interpolation
					b = points[i].b + (len - points[i].l) * (points[i + 1].b - points[i].b) / (points[i + 1].l - points[i].l);
					len2bMap.push({l: len, b: b});

					len = len + lenPerTick;
				}
				if (len2bMap[len2bMap.length - 1].b < points[points.length - 1].b) {
					len2bMap.push({l: points[points.length - 1].l, b: points[points.length - 1].b});
				}
			} else {
				// Special case for 0 length
				len2bMap.push({l: 0, b: points[0].b});
			}
		},

		setUpPoints: function () {
			var curve = this.path,
				tolerance = 2,
				i,
				j,
				k,
				b,
				o,
				val,
				seg;

			this.points = [];

			for (i = 0; i < curve.length - 1; i++) {
				for (j = 0; j < 5; j++) {
					if (j < 4 || i === curve.length - 2) {
						b = j / 4;
						o = { b: i + b };
						val = cubic(curve[i], curve[i + 1], b);
						o.x = val.x;
						o.y = val.y;

						this.points.push(o);
					}
				}
			}
			for (i = 1; i < curve.length; i++) {
				seg = curve.length - i - 1;
				for (j = 0; j < 4; j++) {
					k = 3 - j + seg * 4;
					refinePoints(curve[seg], curve[seg + 1], this.points, k, tolerance);
				}
			}
			return this.points;
		},

		len2b: function (len) {
			if (!this.len2bMap) {
				this.setUpLen2bMap();
			}

			var len2bMap = this.len2bMap,
				index = Math.min(Math.max(0, Math.floor(len / this.len2bStep)), this.len2bMap.length - 2),
				b;

			if (len2bMap.length === 0) {
				return 0;
			}
			if (len2bMap.length === 1) {
				return len2bMap[0].b;
			}
			b = (len - len2bMap[index].l) * (len2bMap[index + 1].b - len2bMap[index].b) / (len2bMap[index + 1].l - len2bMap[index].l) + len2bMap[index].b;

			return b;
		}
	});

	Edge.MotionTween = MotionTween;
	Edge.Timeline.addTweenType("motion", function (prop, ele, fromVal, toVal, keyframes, opts) {
		return new MotionTween("motion", prop, ele, fromVal, toVal, keyframes, opts);
	});
	Edge.Timeline.addTweenProperty("motion", "motion");
	Edge.Timeline.addTweenProperty("location", "motion");

})(window.AdobeEdge);