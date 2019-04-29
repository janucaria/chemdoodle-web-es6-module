import { Atom } from './structures';
import _Canvas3D from './_Canvas3D';
import _AnimatorCanvas from './_AnimatorCanvas';
import RotatorCanvas from './RotatorCanvas';

export default function MovieCanvas3D(id, width, height) {
  if (id) {
    this.create(id, width, height);
  }
  this.frames = [];
};
MovieCanvas3D.PLAY_ONCE = 0;
MovieCanvas3D.PLAY_LOOP = 1;
MovieCanvas3D.PLAY_SPRING = 2;
var _ = MovieCanvas3D.prototype = new _Canvas3D();
_.timeout = 50;
_.frameNumber = 0;
_.playMode = 2;
_.reverse = false;
_.startAnimation = _AnimatorCanvas.prototype.startAnimation;
_.stopAnimation = _AnimatorCanvas.prototype.stopAnimation;
_.isRunning = _AnimatorCanvas.prototype.isRunning;
_.dblclick = RotatorCanvas.prototype.dblclick;
_.nextFrame = function(delta) {
  var f = this.frames[this.frameNumber];
  this.molecules = f.mols;
  this.shapes = f.shapes;
  if (this.playMode === 2 && this.reverse) {
    this.frameNumber--;
    if (this.frameNumber < 0) {
      this.frameNumber = 1;
      this.reverse = false;
    }
  } else {
    this.frameNumber++;
    if (this.frameNumber >= this.frames.length) {
      if (this.playMode === 2) {
        this.frameNumber -= 2;
        this.reverse = true;
      } else {
        this.frameNumber = 0;
        if (this.playMode === 0) {
          this.stopAnimation();
        }
      }
    }
  }
};
_.center = function() {
  // override this function to center the entire movie
  var p = new Atom();
  var first = this.frames[0];
  for ( var j = 0, jj = first.mols.length; j < jj; j++) {
    p.add3D(first.mols[j].getCenter3D());
  }
  p.x /= first.mols.length;
  p.y /= first.mols.length;
  var center = new Atom();
  center.sub3D(p);
  for ( var i = 0, ii = this.frames.length; i < ii; i++) {
    var f = this.frames[i];
    for ( var j = 0, jj = f.mols.length; j < jj; j++) {
      var mol = f.mols[j];
      for ( var k = 0, kk = mol.atoms.length; k < kk; k++) {
        mol.atoms[k].add3D(center);
      }
    }
  }
};
_.addFrame = function(molecules, shapes) {
  this.frames.push({
    mols : molecules,
    shapes : shapes
  });
};
