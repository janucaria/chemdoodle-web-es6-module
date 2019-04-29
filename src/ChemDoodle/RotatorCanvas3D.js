import _Canvas3D from './_Canvas3D';
import _AnimatorCanvas from './_AnimatorCanvas';
import RotatorCanvas from './RotatorCanvas';
import { mat4 as m4 } from './lib';

const m = Math;

// keep these declaration outside the loop to avoid overhead
var matrix = [];
var xAxis = [ 1, 0, 0 ];
var yAxis = [ 0, 1, 0 ];
var zAxis = [ 0, 0, 1 ];

export default function RotatorCanvas3D(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
};
var _ = RotatorCanvas3D.prototype = new _Canvas3D();
_.timeout = 33;
var increment = m.PI / 15;
_.xIncrement = increment;
_.yIncrement = increment;
_.zIncrement = increment;
_.startAnimation = _AnimatorCanvas.prototype.startAnimation;
_.stopAnimation = _AnimatorCanvas.prototype.stopAnimation;
_.isRunning = _AnimatorCanvas.prototype.isRunning;
_.dblclick = RotatorCanvas.prototype.dblclick;
_.mousedown = undefined;
_.rightmousedown = undefined;
_.drag = undefined;
_.mousewheel = undefined;
_.nextFrame = function(delta) {
	if (this.molecules.length === 0 && this.shapes.length === 0) {
		this.stopAnimation();
		return;
	}
	m4.identity(matrix);
	var change = delta / 1000;
	m4.rotate(matrix, this.xIncrement * change, xAxis);
	m4.rotate(matrix, this.yIncrement * change, yAxis);
	m4.rotate(matrix, this.zIncrement * change, zAxis);
	m4.multiply(this.rotationMatrix, matrix);
};
