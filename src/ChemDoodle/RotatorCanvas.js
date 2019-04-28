import _AnimatorCanvas from './_AnimatorCanvas';
import { mat4 as m4 } from './lib';

const m = Math;

// keep these declaration outside the loop to avoid overhead
var matrix = [];
var xAxis = [ 1, 0, 0 ];
var yAxis = [ 0, 1, 0 ];
var zAxis = [ 0, 0, 1 ];

export default function RotatorCanvas(id, width, height, rotate3D) {
  if (id) {
    this.create(id, width, height);
  }
  this.rotate3D = rotate3D;
};
var _ = RotatorCanvas.prototype = new _AnimatorCanvas();
var increment = m.PI / 15;
_.xIncrement = increment;
_.yIncrement = increment;
_.zIncrement = increment;
_.nextFrame = function(delta) {
  if (this.molecules.length === 0 && this.shapes.length === 0) {
    this.stopAnimation();
    return;
  }
  var change = delta / 1000;
  if (this.rotate3D) {
    m4.identity(matrix);
    m4.rotate(matrix, this.xIncrement * change, xAxis);
    m4.rotate(matrix, this.yIncrement * change, yAxis);
    m4.rotate(matrix, this.zIncrement * change, zAxis);
    for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
      var m = this.molecules[i];
      for ( var j = 0, jj = m.atoms.length; j < jj; j++) {
        var a = m.atoms[j];
        var p = [ a.x - this.width / 2, a.y - this.height / 2, a.z ];
        m4.multiplyVec3(matrix, p);
        a.x = p[0] + this.width / 2;
        a.y = p[1] + this.height / 2;
        a.z = p[2];
      }
      for ( var j = 0, jj = m.rings.length; j < jj; j++) {
        m.rings[j].center = m.rings[j].getCenter();
      }
      if (this.specs.atoms_display && this.specs.atoms_circles_2D) {
        m.sortAtomsByZ();
      }
      if (this.specs.bonds_display && this.specs.bonds_clearOverlaps_2D) {
        m.sortBondsByZ();
      }
    }
    for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
      var sps = this.shapes[i].getPoints();
      for ( var j = 0, jj = sps.length; j < jj; j++) {
        var a = sps[j];
        var p = [ a.x - this.width / 2, a.y - this.height / 2, 0 ];
        m4.multiplyVec3(matrix, p);
        a.x = p[0] + this.width / 2;
        a.y = p[1] + this.height / 2;
      }
    }
  } else {
    this.specs.rotateAngle += this.zIncrement * change;
  }
};
_.dblclick = function(e) {
  if (this.isRunning()) {
    this.stopAnimation();
  } else {
    this.startAnimation();
  }
};
