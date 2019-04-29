import _AnimatorCanvas from './_AnimatorCanvas';
import * as math from './math';

export default function SlideshowCanvas(id, width, height) {
  if (id) {
    this.create(id, width, height);
  }
};
var _ = SlideshowCanvas.prototype = new _AnimatorCanvas();
_.frames = [];
_.curIndex = 0;
_.timeout = 5000;
_.alpha = 0;
_.innerHandle = undefined;
_.phase = 0;
_.drawChildExtras = function(ctx) {
  var rgb = math.getRGB(this.specs.backgroundColor, 255);
  ctx.fillStyle = 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + this.alpha + ')';
  ctx.fillRect(0, 0, this.width, this.height);
};
_.nextFrame = function(delta) {
  if (this.frames.length === 0) {
    this.stopAnimation();
    return;
  }
  this.phase = 0;
  var me = this;
  var count = 1;
  this.innerHandle = setInterval(function() {
    me.alpha = count / 15;
    me.repaint();
    if (count === 15) {
      me.breakInnerHandle();
    }
    count++;
  }, 33);
};
_.breakInnerHandle = function() {
  if (this.innerHandle) {
    clearInterval(this.innerHandle);
    this.innerHandle = undefined;
  }
  if (this.phase === 0) {
    this.curIndex++;
    if (this.curIndex > this.frames.length - 1) {
      this.curIndex = 0;
    }
    this.alpha = 1;
    var f = this.frames[this.curIndex];
    this.loadContent(f.mols, f.shapes);
    this.phase = 1;
    var me = this;
    var count = 1;
    this.innerHandle = setInterval(function() {
      me.alpha = (15 - count) / 15;
      me.repaint();
      if (count === 15) {
        me.breakInnerHandle();
      }
      count++;
    }, 33);
  } else if (this.phase === 1) {
    this.alpha = 0;
    this.repaint();
  }
};
_.addFrame = function(molecules, shapes) {
  if (this.frames.length === 0) {
    this.loadContent(molecules, shapes);
  }
  this.frames.push({
    mols : molecules,
    shapes : shapes
  });
};
