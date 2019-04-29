import _Canvas from './_Canvas';
import monitor from './monitor';
import { Point } from './structures';
import { mat4 as m4 } from './lib';

const m = Math;

export default function TransformCanvas(id, width, height, rotate3D) {
	if (id) {
		this.create(id, width, height);
	}
	this.rotate3D = rotate3D;
};
var _ = TransformCanvas.prototype = new _Canvas();
_.lastPoint = undefined;
_.rotationMultMod = 1.3;
_.lastPinchScale = 1;
_.lastGestureRotate = 0;
_.mousedown = function(e) {
	this.lastPoint = e.p;
};
_.dblclick = function(e) {
	// center structure
	this.center();
	this.repaint();
};
_.drag = function(e) {
	if (!this.lastPoint.multi) {
		if (monitor.ALT) {
			var t = new Point(e.p.x, e.p.y);
			t.sub(this.lastPoint);
			for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
				var mol = this.molecules[i];
				for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
					mol.atoms[j].add(t);
				}
				mol.check();
			}
			for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
				var sps = this.shapes[i].getPoints();
				for ( var j = 0, jj = sps.length; j < jj; j++) {
					sps[j].add(t);
				}
			}
			this.lastPoint = e.p;
			this.repaint();
		} else {
			if (this.rotate3D === true) {
				var diameter = m.max(this.width / 4, this.height / 4);
				var difx = e.p.x - this.lastPoint.x;
				var dify = e.p.y - this.lastPoint.y;
				var yIncrement = difx / diameter * this.rotationMultMod;
				var xIncrement = -dify / diameter * this.rotationMultMod;
				var matrix = [];
				m4.identity(matrix);
				m4.rotate(matrix, xIncrement, [ 1, 0, 0 ]);
				m4.rotate(matrix, yIncrement, [ 0, 1, 0 ]);
				for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
					var mol = this.molecules[i];
					for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
						var a = mol.atoms[j];
						var p = [ a.x - this.width / 2, a.y - this.height / 2, a.z ];
						m4.multiplyVec3(matrix, p);
						a.x = p[0] + this.width / 2;
						a.y = p[1] + this.height / 2;
						a.z = p[2];
					}
					for ( var i = 0, ii = mol.rings.length; i < ii; i++) {
						mol.rings[i].center = mol.rings[i].getCenter();
					}
					this.lastPoint = e.p;
					if (this.specs.atoms_display && this.specs.atoms_circles_2D) {
						mol.sortAtomsByZ();
					}
					if (this.specs.bonds_display && this.specs.bonds_clearOverlaps_2D) {
						mol.sortBondsByZ();
					}
				}
				this.repaint();
			} else {
				var center = new Point(this.width / 2, this.height / 2);
				var before = center.angle(this.lastPoint);
				var after = center.angle(e.p);
				this.specs.rotateAngle -= (after - before);
				this.lastPoint = e.p;
				this.repaint();
			}
		}
	}
};
_.mousewheel = function(e, delta) {
	this.specs.scale += delta / 50;
	if (this.specs.scale < .01) {
		this.specs.scale = .01;
	}
	this.repaint();
};
_.multitouchmove = function(e, numFingers) {
	if (numFingers === 2) {
		if (this.lastPoint.multi) {
			var t = new Point(e.p.x, e.p.y);
			t.sub(this.lastPoint);
			for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
				var m = this.molecules[i];
				for ( var j = 0, jj = m.atoms.length; j < jj; j++) {
					m.atoms[j].add(t);
				}
				m.check();
			}
			for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
				var sps = this.shapes[i].getPoints();
				for ( var j = 0, jj = sps.length; j < jj; j++) {
					sps[j].add(t);
				}
			}
			this.lastPoint = e.p;
			this.lastPoint.multi = true;
			this.repaint();
		} else {
			this.lastPoint = e.p;
			this.lastPoint.multi = true;
		}
	}
};
_.gesturechange = function(e) {
	if (e.originalEvent.scale - this.lastPinchScale !== 0) {
		this.specs.scale *= e.originalEvent.scale / this.lastPinchScale;
		if (this.specs.scale < .01) {
			this.specs.scale = .01;
		}
		this.lastPinchScale = e.originalEvent.scale;
	}
	if (this.lastGestureRotate - e.originalEvent.rotation !== 0) {
		var rot = (this.lastGestureRotate - e.originalEvent.rotation) / 180 * m.PI;
		var center = new Point(this.width / 2, this.height / 2);
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			var mol = this.molecules[i];
			for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
				var a = mol.atoms[j];
				var dist = center.distance(a);
				var angle = center.angle(a) + rot;
				a.x = center.x + dist * m.cos(angle);
				a.y = center.y - dist * m.sin(angle);
			}
			mol.check();
		}
		this.lastGestureRotate = e.originalEvent.rotation;
	}
	this.repaint();
};
_.gestureend = function(e) {
	this.lastPinchScale = 1;
	this.lastGestureRotate = 0;
};
