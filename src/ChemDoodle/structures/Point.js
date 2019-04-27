const m = Math;

export default function Point(x, y) {
  this.x = x ? x : 0;
  this.y = y ? y : 0;
};
var _ = Point.prototype;
_.sub = function(p) {
  this.x -= p.x;
  this.y -= p.y;
};
_.add = function(p) {
  this.x += p.x;
  this.y += p.y;
};
_.distance = function(p) {
  var dx = p.x - this.x;
  var dy = p.y - this.y;
  return m.sqrt(dx * dx + dy * dy);
};
_.angleForStupidCanvasArcs = function(p) {
  var dx = p.x - this.x;
  var dy = p.y - this.y;
  var angle = 0;
  // Calculate angle
  if (dx === 0) {
    if (dy === 0) {
      angle = 0;
    } else if (dy > 0) {
      angle = m.PI / 2;
    } else {
      angle = 3 * m.PI / 2;
    }
  } else if (dy === 0) {
    if (dx > 0) {
      angle = 0;
    } else {
      angle = m.PI;
    }
  } else {
    if (dx < 0) {
      angle = m.atan(dy / dx) + m.PI;
    } else if (dy < 0) {
      angle = m.atan(dy / dx) + 2 * m.PI;
    } else {
      angle = m.atan(dy / dx);
    }
  }
  while (angle < 0) {
    angle += m.PI * 2;
  }
  angle = angle % (m.PI * 2);
  return angle;
};
_.angle = function(p) {
  // y is upside down to account for inverted canvas
  var dx = p.x - this.x;
  var dy = this.y - p.y;
  var angle = 0;
  // Calculate angle
  if (dx === 0) {
    if (dy === 0) {
      angle = 0;
    } else if (dy > 0) {
      angle = m.PI / 2;
    } else {
      angle = 3 * m.PI / 2;
    }
  } else if (dy === 0) {
    if (dx > 0) {
      angle = 0;
    } else {
      angle = m.PI;
    }
  } else {
    if (dx < 0) {
      angle = m.atan(dy / dx) + m.PI;
    } else if (dy < 0) {
      angle = m.atan(dy / dx) + 2 * m.PI;
    } else {
      angle = m.atan(dy / dx);
    }
  }
  while (angle < 0) {
    angle += m.PI * 2;
  }
  angle = angle % (m.PI * 2);
  return angle;
};