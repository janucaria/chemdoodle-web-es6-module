import { stringStartsWith } from '../extensions';
import { jQuery as q } from '../lib';
import { Point } from '../structures';
import * as c from '../../ChemDoodle';
const m = Math;

var pack = {};

var namedColors = {
  'aliceblue' : '#f0f8ff',
  'antiquewhite' : '#faebd7',
  'aqua' : '#00ffff',
  'aquamarine' : '#7fffd4',
  'azure' : '#f0ffff',
  'beige' : '#f5f5dc',
  'bisque' : '#ffe4c4',
  'black' : '#000000',
  'blanchedalmond' : '#ffebcd',
  'blue' : '#0000ff',
  'blueviolet' : '#8a2be2',
  'brown' : '#a52a2a',
  'burlywood' : '#deb887',
  'cadetblue' : '#5f9ea0',
  'chartreuse' : '#7fff00',
  'chocolate' : '#d2691e',
  'coral' : '#ff7f50',
  'cornflowerblue' : '#6495ed',
  'cornsilk' : '#fff8dc',
  'crimson' : '#dc143c',
  'cyan' : '#00ffff',
  'darkblue' : '#00008b',
  'darkcyan' : '#008b8b',
  'darkgoldenrod' : '#b8860b',
  'darkgray' : '#a9a9a9',
  'darkgreen' : '#006400',
  'darkkhaki' : '#bdb76b',
  'darkmagenta' : '#8b008b',
  'darkolivegreen' : '#556b2f',
  'darkorange' : '#ff8c00',
  'darkorchid' : '#9932cc',
  'darkred' : '#8b0000',
  'darksalmon' : '#e9967a',
  'darkseagreen' : '#8fbc8f',
  'darkslateblue' : '#483d8b',
  'darkslategray' : '#2f4f4f',
  'darkturquoise' : '#00ced1',
  'darkviolet' : '#9400d3',
  'deeppink' : '#ff1493',
  'deepskyblue' : '#00bfff',
  'dimgray' : '#696969',
  'dodgerblue' : '#1e90ff',
  'firebrick' : '#b22222',
  'floralwhite' : '#fffaf0',
  'forestgreen' : '#228b22',
  'fuchsia' : '#ff00ff',
  'gainsboro' : '#dcdcdc',
  'ghostwhite' : '#f8f8ff',
  'gold' : '#ffd700',
  'goldenrod' : '#daa520',
  'gray' : '#808080',
  'green' : '#008000',
  'greenyellow' : '#adff2f',
  'honeydew' : '#f0fff0',
  'hotpink' : '#ff69b4',
  'indianred ' : '#cd5c5c',
  'indigo ' : '#4b0082',
  'ivory' : '#fffff0',
  'khaki' : '#f0e68c',
  'lavender' : '#e6e6fa',
  'lavenderblush' : '#fff0f5',
  'lawngreen' : '#7cfc00',
  'lemonchiffon' : '#fffacd',
  'lightblue' : '#add8e6',
  'lightcoral' : '#f08080',
  'lightcyan' : '#e0ffff',
  'lightgoldenrodyellow' : '#fafad2',
  'lightgrey' : '#d3d3d3',
  'lightgreen' : '#90ee90',
  'lightpink' : '#ffb6c1',
  'lightsalmon' : '#ffa07a',
  'lightseagreen' : '#20b2aa',
  'lightskyblue' : '#87cefa',
  'lightslategray' : '#778899',
  'lightsteelblue' : '#b0c4de',
  'lightyellow' : '#ffffe0',
  'lime' : '#00ff00',
  'limegreen' : '#32cd32',
  'linen' : '#faf0e6',
  'magenta' : '#ff00ff',
  'maroon' : '#800000',
  'mediumaquamarine' : '#66cdaa',
  'mediumblue' : '#0000cd',
  'mediumorchid' : '#ba55d3',
  'mediumpurple' : '#9370d8',
  'mediumseagreen' : '#3cb371',
  'mediumslateblue' : '#7b68ee',
  'mediumspringgreen' : '#00fa9a',
  'mediumturquoise' : '#48d1cc',
  'mediumvioletred' : '#c71585',
  'midnightblue' : '#191970',
  'mintcream' : '#f5fffa',
  'mistyrose' : '#ffe4e1',
  'moccasin' : '#ffe4b5',
  'navajowhite' : '#ffdead',
  'navy' : '#000080',
  'oldlace' : '#fdf5e6',
  'olive' : '#808000',
  'olivedrab' : '#6b8e23',
  'orange' : '#ffa500',
  'orangered' : '#ff4500',
  'orchid' : '#da70d6',
  'palegoldenrod' : '#eee8aa',
  'palegreen' : '#98fb98',
  'paleturquoise' : '#afeeee',
  'palevioletred' : '#d87093',
  'papayawhip' : '#ffefd5',
  'peachpuff' : '#ffdab9',
  'peru' : '#cd853f',
  'pink' : '#ffc0cb',
  'plum' : '#dda0dd',
  'powderblue' : '#b0e0e6',
  'purple' : '#800080',
  'red' : '#ff0000',
  'rosybrown' : '#bc8f8f',
  'royalblue' : '#4169e1',
  'saddlebrown' : '#8b4513',
  'salmon' : '#fa8072',
  'sandybrown' : '#f4a460',
  'seagreen' : '#2e8b57',
  'seashell' : '#fff5ee',
  'sienna' : '#a0522d',
  'silver' : '#c0c0c0',
  'skyblue' : '#87ceeb',
  'slateblue' : '#6a5acd',
  'slategray' : '#708090',
  'snow' : '#fffafa',
  'springgreen' : '#00ff7f',
  'steelblue' : '#4682b4',
  'tan' : '#d2b48c',
  'teal' : '#008080',
  'thistle' : '#d8bfd8',
  'tomato' : '#ff6347',
  'turquoise' : '#40e0d0',
  'violet' : '#ee82ee',
  'wheat' : '#f5deb3',
  'white' : '#ffffff',
  'whitesmoke' : '#f5f5f5',
  'yellow' : '#ffff00',
  'yellowgreen' : '#9acd32'
};

export function angleBetweenLargest(angles) {
  if (angles.length === 0) {
    return {
      angle : 0,
      largest : m.PI * 2
    };
  }
  if (angles.length === 1) {
    return {
      angle : angles[0] + m.PI,
      largest : m.PI * 2
    };
  }
  var largest = 0;
  var angle = 0;
  for ( var i = 0, ii = angles.length - 1; i < ii; i++) {
    var dif = angles[i + 1] - angles[i];
    if (dif > largest) {
      largest = dif;
      angle = (angles[i + 1] + angles[i]) / 2;
    }
  }
  var last = angles[0] + m.PI * 2 - angles[angles.length - 1];
  if (last > largest) {
    angle = angles[0] - last / 2;
    largest = last;
    if (angle < 0) {
      angle += m.PI * 2;
    }
  }
  return {
    angle : angle,
    largest : largest
  };
};

export function isBetween(x, left, right) {
  if (left > right) {
    var tmp = left;
    left = right;
    right = tmp;
  }
  return x >= left && x <= right;
};

// be careful not to remove this, as this will cause corruption issues
// contact iChemLabs for instructions to remove this
q(document).ready(function() {
  if(c && c.iChemLabs && c.iChemLabs.checkForUpdates){
    c.iChemLabs.checkForUpdates({});
  }
});

export function getRGB(color, multiplier) {
  var err = [ 0, 0, 0 ];
  if (namedColors[color.toLowerCase()]) {
    color = namedColors[color.toLowerCase()];
  }
  if (color.charAt(0) === '#') {
    if (color.length === 4) {
      color = '#' + color.charAt(1) + color.charAt(1) + color.charAt(2) + color.charAt(2) + color.charAt(3) + color.charAt(3);
    }
    return [ parseInt(color.substring(1, 3), 16) / 255.0 * multiplier, parseInt(color.substring(3, 5), 16) / 255.0 * multiplier, parseInt(color.substring(5, 7), 16) / 255.0 * multiplier ];
  } else if (stringStartsWith(color, 'rgb')) {
    var cs = color.replace(/rgb\(|\)/g, '').split(',');
    if (cs.length !== 3) {
      return err;
    }
    return [ parseInt(cs[0]) / 255.0 * multiplier, parseInt(cs[1]) / 255.0 * multiplier, parseInt(cs[2]) / 255.0 * multiplier ];
  }
  return err;
};

export function hsl2rgb(h, s, l) {
  var hue2rgb = function(p, q, t) {
    if (t < 0) {
      t += 1;
    } else if (t > 1) {
      t -= 1;
    }
    if (t < 1 / 6) {
      return p + (q - p) * 6 * t;
    } else if (t < 1 / 2) {
      return q;
    } else if (t < 2 / 3) {
      return p + (q - p) * (2 / 3 - t) * 6;
    }
    return p;
  };
  var r, g, b;
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [ r * 255, g * 255, b * 255 ];
};

export function idx2color(value) {
  var hex = value.toString(16);

  // add '0' padding
  for ( var i = 0, ii = 6 - hex.length; i < ii; i++) {
    hex = "0" + hex;
  }

  return "#" + hex;
};

export function distanceFromPointToLineInclusive(p, l1, l2, retract) {
  var length = l1.distance(l2);
  var angle = l1.angle(l2);
  var angleDif = m.PI / 2 - angle;
  var newAngleP = l1.angle(p) + angleDif;
  var pDist = l1.distance(p);
  var pcopRot = new Point(pDist * m.cos(newAngleP), -pDist * m.sin(newAngleP));
  var pull = retract?retract:0;
  if (isBetween(-pcopRot.y, pull, length-pull)) {
    return m.abs(pcopRot.x);
  }
  return -1;
};

export function calculateDistanceInterior(to, from, r) {
  if (isBetween(from.x, r.x, r.x + r.w) && isBetween(from.y, r.y, r.y + r.h)) {
    return to.distance(from);
  }
  // calculates the distance that a line needs to remove from itself to be
  // outside that rectangle
  var lines = [];
  // top
  lines.push({
    x1 : r.x,
    y1 : r.y,
    x2 : r.x + r.w,
    y2 : r.y
  });
  // bottom
  lines.push({
    x1 : r.x,
    y1 : r.y + r.h,
    x2 : r.x + r.w,
    y2 : r.y + r.h
  });
  // left
  lines.push({
    x1 : r.x,
    y1 : r.y,
    x2 : r.x,
    y2 : r.y + r.h
  });
  // right
  lines.push({
    x1 : r.x + r.w,
    y1 : r.y,
    x2 : r.x + r.w,
    y2 : r.y + r.h
  });

  var intersections = [];
  for ( var i = 0; i < 4; i++) {
    var l = lines[i];
    var p = intersectLines(from.x, from.y, to.x, to.y, l.x1, l.y1, l.x2, l.y2);
    if (p) {
      intersections.push(p);
    }
  }
  if (intersections.length === 0) {
    return 0;
  }
  var max = 0;
  for ( var i = 0, ii = intersections.length; i < ii; i++) {
    var p = intersections[i];
    var dx = to.x - p.x;
    var dy = to.y - p.y;
    max = m.max(max, m.sqrt(dx * dx + dy * dy));
  }
  return max;
};

export function intersectLines(ax, ay, bx, by, cx, cy, dx, dy) {
  // calculate the direction vectors
  bx -= ax;
  by -= ay;
  dx -= cx;
  dy -= cy;

  // are they parallel?
  var denominator = by * dx - bx * dy;
  if (denominator === 0) {
    return false;
  }

  // calculate point of intersection
  var r = (dy * (ax - cx) - dx * (ay - cy)) / denominator;
  var s = (by * (ax - cx) - bx * (ay - cy)) / denominator;
  if ((s >= 0) && (s <= 1) && (r >= 0) && (r <= 1)) {
    return {
      x : (ax + r * bx),
      y : (ay + r * by)
    };
  } else {
    return false;
  }
};

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
};

export function rainbowAt(i, ii, colors) {

  // The rainbow colors length must be more than one color
  if (colors.length < 1) {
    colors.push('#000000', '#FFFFFF');
  } else if (colors.length < 2) {
    colors.push('#FFFFFF');
  }

  var step = ii / (colors.length - 1);
  var j = m.floor(i / step);
  var t = (i - j * step) / step;
  var startColor = getRGB(colors[j], 1);
  var endColor = getRGB(colors[j + 1], 1);

  var lerpColor = [ (startColor[0] + (endColor[0] - startColor[0]) * t) * 255, (startColor[1] + (endColor[1] - startColor[1]) * t) * 255, (startColor[2] + (endColor[2] - startColor[2]) * t) * 255 ];

  return 'rgb(' + lerpColor.join(',') + ')';
};

export function angleBounds(angle, convertToDegrees, limitToPi) {
  var full = m.PI*2;
  while(angle<0){
    angle+=full;
  }
  while(angle>full){
    angle-=full;
  }
  if(limitToPi && angle>m.PI){
    angle = 2*m.PI-angle;
  }
  if(convertToDegrees){
    angle = 180*angle/m.PI;
  }
  return angle;
};

export function isPointInPoly(poly, pt) {
  for ( var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i) {
    ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y)) && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) && (c = !c);
  }
  return c;
};
