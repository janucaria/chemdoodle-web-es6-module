import animations from './animations';
import _Canvas from './_Canvas';

export default function _AnimatorCanvas(id, width, height) {
  if (id) {
    this.create(id, width, height);
  }
};
var _ = _AnimatorCanvas.prototype = new _Canvas();
_.timeout = 33;
_.startAnimation = function() {
  this.stopAnimation();
  this.lastTime = new Date().getTime();
  var me = this;
  if (this.nextFrame) {
    this.handle = animations.requestInterval(function() {
      // advance clock
      var timeNow = new Date().getTime();
      // update and repaint
      me.nextFrame(timeNow - me.lastTime);
      me.repaint();
      me.lastTime = timeNow;
    }, this.timeout);
  }
};
_.stopAnimation = function() {
  if (this.handle) {
    animations.clearRequestInterval(this.handle);
    this.handle = undefined;
  }
};
_.isRunning = function() {
  // must compare to undefined here to return a boolean
  return this.handle !== undefined;
};
