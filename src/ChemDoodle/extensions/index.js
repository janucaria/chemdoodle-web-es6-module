import { vec3 as v3 } from '../lib';
const m = Math;

export function stringStartsWith(str, match) {
  return str.slice(0, match.length) === match;
}

export function vec3AngleFrom(v1, v2) {
  var length1 = v3.length(v1);
  var length2 = v3.length(v2);
  var dot = v3.dot(v1, v2);
  var cosine = dot / length1 / length2;
  return m.acos(cosine);
}

export function contextRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function contextEllipse(ctx, x, y, w, h) {
  var kappa = .5522848;
  var ox = (w / 2) * kappa;
  var oy = (h / 2) * kappa;
  var xe = x + w;
  var ye = y + h;
  var xm = x + w / 2;
  var ym = y + h / 2;

  ctx.beginPath();
  ctx.moveTo(x, ym);
  ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
  ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
  ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
  ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
  ctx.closePath();
}

export function getFontString(size, families, bold, italic) {
  var sb = [];
  if (bold) {
    sb.push('bold ');
  }
  if (italic) {
    sb.push('italic ');
  }
  sb.push(size + 'px ');
  for ( var i = 0, ii = families.length; i < ii; i++) {
    var use = families[i];
    if (use.indexOf(' ') !== -1) {
      use = '"' + use + '"';
    }
    sb.push((i !== 0 ? ',' : '') + use);
  }
  return sb.join('');
}
