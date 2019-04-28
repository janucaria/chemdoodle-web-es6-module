import * as extensions from '../extensions';

const m = Math;

export default function Plate(lanes) {
  this.lanes = new Array(lanes);
  for (i = 0, ii = lanes; i < ii; i++) {
    this.lanes[i] = [];
  }
};
var _ = Plate.prototype;
_.sort = function() {
  for (i = 0, ii = this.lanes.length; i < ii; i++) {
    this.lanes[i].sort(function(a, b) {
      return a - b;
    });
  }
};
_.draw = function(ctx, specs) {
  // Front and origin
  var width = ctx.canvas.width;
  var height = ctx.canvas.height;
  this.origin = 9 * height / 10;
  this.front = height / 10;
  this.laneLength = this.origin - this.front;
  ctx.strokeStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(0, this.front);
  ctx.lineTo(width, this.front);
  ctx.setLineDash([3]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, this.origin);
  ctx.lineTo(width, this.origin);
  ctx.closePath();
  ctx.stroke();
  // Lanes
  for (i = 0, ii = this.lanes.length; i < ii; i++) {
    var laneX = (i + 1) * width / (ii + 1);
    ctx.beginPath();
    ctx.moveTo(laneX, this.origin);
    ctx.lineTo(laneX, this.origin + 3);
    ctx.closePath();
    ctx.stroke();
    // Spots
    for (s = 0, ss = this.lanes[i].length; s < ss; s++) {
      var spotY = this.origin - (this.laneLength * this.lanes[i][s].rf);
      switch (this.lanes[i][s].type) {
      case 'compact':
        ctx.beginPath();
        ctx.arc(laneX, spotY, 3, 0, 2 * m.PI, false);
        ctx.closePath();
        break;
      case 'expanded':
        ctx.beginPath();
        ctx.arc(laneX, spotY, 7, 0, 2 * m.PI, false);
        ctx.closePath();
        break;
      case 'trailing':
        // trailing
        break;
      case 'widened':
        extensions.contextEllipse(ctx, laneX - 18, spotY - 10, 36, 10);
        break;
      case 'cresent':
        ctx.beginPath();
        ctx.arc(laneX, spotY, 9, 0, m.PI, true);
        ctx.closePath();
        break;
      }
      switch (this.lanes[i][s].style) {
      case 'solid':
        ctx.fillStyle = '#000000';
        ctx.fill();
        break;
      case 'transparent':
        ctx.stroke();
        break;
      case 'gradient':
        // gradient
        break;
      }
    }
  }
};

Plate.Spot = function(type, rf, style) {
  this.type = type;
  this.rf = rf;
  this.style = style ? style : 'solid';
};
