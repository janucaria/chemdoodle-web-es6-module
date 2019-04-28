import { mat4 as m4, vec3 as v3 } from '../lib';
import Atom from './Atom';

const m = Math;

var SB;
var lastVerticalResolution = -1;

function setupMatrices(verticalResolution) {
	var n2 = verticalResolution * verticalResolution;
	var n3 = verticalResolution * verticalResolution * verticalResolution;
	var S = [ 6 / n3, 0, 0, 0, 6 / n3, 2 / n2, 0, 0, 1 / n3, 1 / n2, 1 / verticalResolution, 0, 0, 0, 0, 1 ];
	var Bm = [ -1 / 6, 1 / 2, -1 / 2, 1 / 6, 1 / 2, -1, 1 / 2, 0, -1 / 2, 0, 1 / 2, 0, 1 / 6, 2 / 3, 1 / 6, 0 ];
	SB = m4.multiply(Bm, S, []);
	lastVerticalResolution = verticalResolution;
}

export default function Residue(resSeq) {
	// number of vertical slashes per segment
	this.resSeq = resSeq;
};
var _ = Residue.prototype;
_.setup = function(nextAlpha, horizontalResolution) {
	this.horizontalResolution = horizontalResolution;
	// define plane
	var A = [ nextAlpha.x - this.cp1.x, nextAlpha.y - this.cp1.y, nextAlpha.z - this.cp1.z ];
	var B = [ this.cp2.x - this.cp1.x, this.cp2.y - this.cp1.y, this.cp2.z - this.cp1.z ];
	var C = v3.cross(A, B, []);
	this.D = v3.cross(C, A, []);
	v3.normalize(C);
	v3.normalize(this.D);
	// generate guide coordinates
	// guides for the narrow parts of the ribbons
	this.guidePointsSmall = [];
	// guides for the wide parts of the ribbons
	this.guidePointsLarge = [];
	// guides for the ribbon part of helix as cylinder model
	var P = [ (nextAlpha.x + this.cp1.x) / 2, (nextAlpha.y + this.cp1.y) / 2, (nextAlpha.z + this.cp1.z) / 2 ];
	if (this.helix) {
		// expand helices
		v3.scale(C, 1.5);
		v3.add(P, C);
	}
	this.guidePointsSmall[0] = new Atom('', P[0] - this.D[0] / 2, P[1] - this.D[1] / 2, P[2] - this.D[2] / 2);
	for ( var i = 1; i < horizontalResolution; i++) {
		this.guidePointsSmall[i] = new Atom('', this.guidePointsSmall[0].x + this.D[0] * i / horizontalResolution, this.guidePointsSmall[0].y + this.D[1] * i / horizontalResolution, this.guidePointsSmall[0].z + this.D[2] * i / horizontalResolution);
	}
	v3.scale(this.D, 4);
	this.guidePointsLarge[0] = new Atom('', P[0] - this.D[0] / 2, P[1] - this.D[1] / 2, P[2] - this.D[2] / 2);
	for ( var i = 1; i < horizontalResolution; i++) {
		this.guidePointsLarge[i] = new Atom('', this.guidePointsLarge[0].x + this.D[0] * i / horizontalResolution, this.guidePointsLarge[0].y + this.D[1] * i / horizontalResolution, this.guidePointsLarge[0].z + this.D[2] * i / horizontalResolution);
	}
};
_.getGuidePointSet = function(type) {
	if (type === 0) {
		return this.helix || this.sheet ? this.guidePointsLarge : this.guidePointsSmall;
	} else if (type === 1) {
		return this.guidePointsSmall;
	} else if (type === 2) {
		return this.guidePointsLarge;
	}
};
_.computeLineSegments = function(b2, b1, a1, doCartoon, verticalResolution) {
	this.setVerticalResolution(verticalResolution);
	this.split = a1.helix !== this.helix || a1.sheet !== this.sheet;
	this.lineSegments = this.innerCompute(0, b2, b1, a1, false, verticalResolution);
	if (doCartoon) {
		this.lineSegmentsCartoon = this.innerCompute(this.helix || this.sheet ? 2 : 1, b2, b1, a1, true, verticalResolution);
	}
};
_.innerCompute = function(set, b2, b1, a1, useArrows, verticalResolution) {
	var segments = [];
	var use = this.getGuidePointSet(set);
	var useb2 = b2.getGuidePointSet(set);
	var useb1 = b1.getGuidePointSet(set);
	var usea1 = a1.getGuidePointSet(set);
	for ( var l = 0, ll = use.length; l < ll; l++) {
		var G = [ useb2[l].x, useb2[l].y, useb2[l].z, 1, useb1[l].x, useb1[l].y, useb1[l].z, 1, use[l].x, use[l].y, use[l].z, 1, usea1[l].x, usea1[l].y, usea1[l].z, 1 ];
		var M = m4.multiply(G, SB, []);
		var strand = [];
		for ( var k = 0; k < verticalResolution; k++) {
			for ( var i = 3; i > 0; i--) {
				for ( var j = 0; j < 4; j++) {
					M[i * 4 + j] += M[(i - 1) * 4 + j];
				}
			}
			strand[k] = new Atom('', M[12] / M[15], M[13] / M[15], M[14] / M[15]);
		}
		segments[l] = strand;
	}
	if (useArrows && this.arrow) {
		for ( var i = 0, ii = verticalResolution; i < ii; i++) {
			var mult = 1.5 - 1.3 * i / verticalResolution;
			var mid = m.floor(this.horizontalResolution / 2);
			var center = segments[mid];
			for ( var j = 0, jj = segments.length; j < jj; j++) {
				if (j !== mid) {
					var o = center[i];
					var f = segments[j][i];
					var vec = [ f.x - o.x, f.y - o.y, f.z - o.z ];
					v3.scale(vec, mult);
					f.x = o.x + vec[0];
					f.y = o.y + vec[1];
					f.z = o.z + vec[2];
				}
			}
		}
	}
	return segments;
};
_.setVerticalResolution = function(verticalResolution) {
	if (verticalResolution !== lastVerticalResolution) {
		setupMatrices(verticalResolution);
	}
};
