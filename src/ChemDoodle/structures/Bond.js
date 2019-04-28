import * as extensions from '../extensions';
import * as math from '../math';
import { mat4 as m4, vec3 as v3 } from '../lib';
import Point from './Point';
const m = Math;

export default function Bond(a1, a2, bondOrder) {
  this.a1 = a1;
  this.a2 = a2;
  // bondOrder can be 0, so need to check against undefined
  this.bondOrder = bondOrder !== undefined ? bondOrder : 1;
};
Bond.STEREO_NONE = 'none';
Bond.STEREO_PROTRUDING = 'protruding';
Bond.STEREO_RECESSED = 'recessed';
Bond.STEREO_AMBIGUOUS = 'ambiguous';
var _ = Bond.prototype;
_.stereo = Bond.STEREO_NONE;
_.isHover = false;
_.ring = undefined;
_.getCenter = function() {
  return new Point((this.a1.x + this.a2.x) / 2, (this.a1.y + this.a2.y) / 2);
};
_.getLength = function() {
  return this.a1.distance(this.a2);
};
_.getLength3D = function() {
  return this.a1.distance3D(this.a2);
};
_.contains = function(a) {
  return a === this.a1 || a === this.a2;
};
_.getNeighbor = function(a) {
  if (a === this.a1) {
    return this.a2;
  } else if (a === this.a2) {
    return this.a1;
  }
  return undefined;
};
_.draw = function(ctx, specs) {
  if (this.a1.x === this.a2.x && this.a1.y === this.a2.y) {
    // return, as there is nothing to render, will only cause fill
    // overflows
    return;
  }
  if (this.specs) {
    specs = this.specs;
  }
  var x1 = this.a1.x;
  var x2 = this.a2.x;
  var y1 = this.a1.y;
  var y2 = this.a2.y;
  var dist = this.a1.distance(this.a2);
  var difX = x2 - x1;
  var difY = y2 - y1;
  if (this.a1.isLassoed && this.a2.isLassoed) {
    var grd = ctx.createLinearGradient(x1, y1, x2, y2);
    grd.addColorStop(0, 'rgba(212, 99, 0, 0)');
    grd.addColorStop(0.5, 'rgba(212, 99, 0, 0.8)');
    grd.addColorStop(1, 'rgba(212, 99, 0, 0)');
    var useDist = 2.5;
    var perpendicular = this.a1.angle(this.a2) + m.PI / 2;
    var mcosp = m.cos(perpendicular);
    var msinp = m.sin(perpendicular);
    var cx1 = x1 - mcosp * useDist;
    var cy1 = y1 + msinp * useDist;
    var cx2 = x1 + mcosp * useDist;
    var cy2 = y1 - msinp * useDist;
    var cx3 = x2 + mcosp * useDist;
    var cy3 = y2 - msinp * useDist;
    var cx4 = x2 - mcosp * useDist;
    var cy4 = y2 + msinp * useDist;
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(cx1, cy1);
    ctx.lineTo(cx2, cy2);
    ctx.lineTo(cx3, cy3);
    ctx.lineTo(cx4, cy4);
    ctx.closePath();
    ctx.fill();
  }
  if (specs.atoms_display && !specs.atoms_circles_2D && this.a1.isLabelVisible(specs) && this.a1.textBounds) {
    var distShrink = 0;
    for ( var i = 0, ii = this.a1.textBounds.length; i < ii; i++) {
      distShrink = Math.max(distShrink, math.calculateDistanceInterior(this.a1, this.a2, this.a1.textBounds[i]));
    }
    distShrink += specs.bonds_atomLabelBuffer_2D;
    var perc = distShrink / dist;
    x1 += difX * perc;
    y1 += difY * perc;
  }
  if (specs.atoms_display && !specs.atoms_circles_2D && this.a2.isLabelVisible(specs) && this.a2.textBounds) {
    var distShrink = 0;
    for ( var i = 0, ii = this.a2.textBounds.length; i < ii; i++) {
      distShrink = Math.max(distShrink, math.calculateDistanceInterior(this.a2, this.a1, this.a2.textBounds[i]));
    }
    distShrink += specs.bonds_atomLabelBuffer_2D;
    var perc = distShrink / dist;
    x2 -= difX * perc;
    y2 -= difY * perc;
  }
  if (specs.bonds_clearOverlaps_2D) {
    var xs = x1 + difX * .15;
    var ys = y1 + difY * .15;
    var xf = x2 - difX * .15;
    var yf = y2 - difY * .15;
    ctx.strokeStyle = specs.backgroundColor;
    ctx.lineWidth = specs.bonds_width_2D + specs.bonds_overlapClearWidth_2D * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(xs, ys);
    ctx.lineTo(xf, yf);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.strokeStyle = this.error?specs.colorError:specs.bonds_color;
  ctx.fillStyle = this.error?specs.colorError:specs.bonds_color;
  ctx.lineWidth = specs.bonds_width_2D;
  ctx.lineCap = specs.bonds_ends_2D;
  if (specs.bonds_splitColor) {
    var linearGradient = ctx.createLinearGradient(x1, y1, x2, y2);
    var specs1 = this.a1.specs?this.a1.specs:specs;
    var specs2 = this.a2.specs?this.a2.specs:specs;
    var color1 = this.a1.getElementColor(specs1.atoms_useJMOLColors, specs1.atoms_usePYMOLColors, specs1.atoms_color, 2);
    var color2 = this.a2.getElementColor(specs2.atoms_useJMOLColors, specs2.atoms_usePYMOLColors, specs2.atoms_color, 2);
    linearGradient.addColorStop(0, color1);
    if (!specs.bonds_colorGradient) {
      linearGradient.addColorStop(0.5, color1);
      linearGradient.addColorStop(0.51, color2);
    }
    linearGradient.addColorStop(1, color2);
    ctx.strokeStyle = linearGradient;
    ctx.fillStyle = linearGradient;
  }
  if (specs.bonds_lewisStyle_2D && this.bondOrder % 1 === 0) {
    this.drawLewisStyle(ctx, specs, x1, y1, x2, y2);
  } else {
    switch (this.query?1:this.bondOrder) {
    case 0:
      var dx = x2 - x1;
      var dy = y2 - y1;
      var innerDist = m.sqrt(dx * dx + dy * dy);
      var num = m.floor(innerDist / specs.bonds_dotSize_2D);
      var remainder = (innerDist - (num - 1) * specs.bonds_dotSize_2D) / 2;
      if (num % 2 === 1) {
        remainder += specs.bonds_dotSize_2D / 4;
      } else {
        remainder -= specs.bonds_dotSize_2D / 4;
        num += 2;
      }
      num /= 2;
      var angle = this.a1.angle(this.a2);
      var xs = x1 + remainder * Math.cos(angle);
      var ys = y1 - remainder * Math.sin(angle);
      ctx.beginPath();
      for ( var i = 0; i < num; i++) {
        ctx.arc(xs, ys, specs.bonds_dotSize_2D / 2, 0, m.PI * 2, false);
        xs += 2 * specs.bonds_dotSize_2D * Math.cos(angle);
        ys -= 2 * specs.bonds_dotSize_2D * Math.sin(angle);
      }
      ctx.fill();
      break;
    case 0.5:
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.setLineDash([specs.bonds_hashSpacing_2D, specs.bonds_hashSpacing_2D]);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case 1:
      if (!this.query && (this.stereo === Bond.STEREO_PROTRUDING || this.stereo === Bond.STEREO_RECESSED)) {
        var thinSpread = specs.bonds_width_2D / 2;
        var useDist = specs.bonds_wedgeThickness_2D/2;
        var perpendicular = this.a1.angle(this.a2) + m.PI / 2;
        var mcosp = m.cos(perpendicular);
        var msinp = m.sin(perpendicular);
        var cx1 = x1 - mcosp * thinSpread;
        var cy1 = y1 + msinp * thinSpread;
        var cx2 = x1 + mcosp * thinSpread;
        var cy2 = y1 - msinp * thinSpread;
        var cx3 = x2 + mcosp * useDist;
        var cy3 = y2 - msinp * useDist;
        var cx4 = x2 - mcosp * useDist;
        var cy4 = y2 + msinp * useDist;
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.lineTo(cx3, cy3);
        ctx.lineTo(cx4, cy4);
        ctx.closePath();
        if (this.stereo === Bond.STEREO_PROTRUDING) {
          ctx.fill();
        } else {
          ctx.save();
          ctx.clip();
          ctx.lineWidth = useDist * 2;
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          // workaround to lengthen distance for Firefox as there is a bug, shouldn't affect rendering or performance
          var dx = x2 - x1;
          var dy = y2 - y1;
          ctx.lineTo(x2+5*dx, y2+5*dy);
          ctx.setLineDash([specs.bonds_hashWidth_2D, specs.bonds_hashSpacing_2D]);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      } else if (!this.query && this.stereo === Bond.STEREO_AMBIGUOUS) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        var curves = m.floor(m.sqrt(difX * difX + difY * difY) / specs.bonds_wavyLength_2D);
        var x = x1;
        var y = y1;
        var perpendicular = this.a1.angle(this.a2) + m.PI / 2;
        var mcosp = m.cos(perpendicular);
        var msinp = m.sin(perpendicular);

        var curveX = difX / curves;
        var curveY = difY / curves;
        var cpx1, cpx2, cpy1, cpy2;
        for ( var i = 0, ii = curves; i < ii; i++) {
          x += curveX;
          y += curveY;
          cpx1 = specs.bonds_wavyLength_2D * mcosp + x - curveX * 0.5;
          cpy1 = specs.bonds_wavyLength_2D * -msinp + y - curveY * 0.5;
          cpx2 = specs.bonds_wavyLength_2D * -mcosp + x - curveX * 0.5;
          cpy2 = specs.bonds_wavyLength_2D * msinp + y - curveY * 0.5;
          if (i % 2 === 0) {
            ctx.quadraticCurveTo(cpx1, cpy1, x, y);
          } else {
            ctx.quadraticCurveTo(cpx2, cpy2, x, y);
          }
        }
        ctx.stroke();
        break;
      } else {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        if(this.query){
          this.query.draw(ctx, specs, this.getCenter());
        }
      }
      break;
    case 1.5:
    case 2:
      var angle = this.a1.angle(this.a2);
      var perpendicular = angle + m.PI / 2;
      var mcosp = m.cos(perpendicular);
      var msinp = m.sin(perpendicular);
      var dist = this.a1.distance(this.a2);
      var useDist = specs.bonds_useAbsoluteSaturationWidths_2D?specs.bonds_saturationWidthAbs_2D/2:dist * specs.bonds_saturationWidth_2D / 2;
      if (this.stereo === Bond.STEREO_AMBIGUOUS) {
        var cx1 = x1 - mcosp * useDist;
        var cy1 = y1 + msinp * useDist;
        var cx2 = x1 + mcosp * useDist;
        var cy2 = y1 - msinp * useDist;
        var cx3 = x2 + mcosp * useDist;
        var cy3 = y2 - msinp * useDist;
        var cx4 = x2 - mcosp * useDist;
        var cy4 = y2 + msinp * useDist;
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx3, cy3);
        ctx.moveTo(cx2, cy2);
        ctx.lineTo(cx4, cy4);
        ctx.stroke();
      } else if (!specs.bonds_symmetrical_2D && (this.ring || this.a1.label === 'C' && this.a2.label === 'C')) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        var clip = 0;
        useDist*=2;
        var clipAngle = specs.bonds_saturationAngle_2D;
        if (clipAngle < m.PI / 2) {
          clip = -(useDist / m.tan(clipAngle));
        }
        if (m.abs(clip) < dist / 2) {
          var xuse1 = x1 - m.cos(angle) * clip;
          var xuse2 = x2 + m.cos(angle) * clip;
          var yuse1 = y1 + m.sin(angle) * clip;
          var yuse2 = y2 - m.sin(angle) * clip;
          var cx1 = xuse1 - mcosp * useDist;
          var cy1 = yuse1 + msinp * useDist;
          var cx2 = xuse1 + mcosp * useDist;
          var cy2 = yuse1 - msinp * useDist;
          var cx3 = xuse2 - mcosp * useDist;
          var cy3 = yuse2 + msinp * useDist;
          var cx4 = xuse2 + mcosp * useDist;
          var cy4 = yuse2 - msinp * useDist;
          var flip = !this.ring || (this.ring.center.angle(this.a1) > this.ring.center.angle(this.a2) && !(this.ring.center.angle(this.a1) - this.ring.center.angle(this.a2) > m.PI) || (this.ring.center.angle(this.a1) - this.ring.center.angle(this.a2) < -m.PI));
          ctx.beginPath();
          if (flip) {
            ctx.moveTo(cx1, cy1);
            ctx.lineTo(cx3, cy3);
          } else {
            ctx.moveTo(cx2, cy2);
            ctx.lineTo(cx4, cy4);
          }
          if (this.bondOrder !== 2) {
            ctx.setLineDash([specs.bonds_hashSpacing_2D, specs.bonds_hashSpacing_2D]);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        var cx1 = x1 - mcosp * useDist;
        var cy1 = y1 + msinp * useDist;
        var cx2 = x1 + mcosp * useDist;
        var cy2 = y1 - msinp * useDist;
        var cx3 = x2 + mcosp * useDist;
        var cy3 = y2 - msinp * useDist;
        var cx4 = x2 - mcosp * useDist;
        var cy4 = y2 + msinp * useDist;
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx4, cy4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx2, cy2);
        ctx.lineTo(cx3, cy3);
        if (this.bondOrder !== 2) {
          ctx.setLineDash([specs.bonds_hashWidth_2D, specs.bonds_hashSpacing_2D]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      break;
    case 3:
      var useDist = specs.bonds_useAbsoluteSaturationWidths_2D?specs.bonds_saturationWidthAbs_2D:this.a1.distance(this.a2) * specs.bonds_saturationWidth_2D;
      var perpendicular = this.a1.angle(this.a2) + m.PI / 2;
      var mcosp = m.cos(perpendicular);
      var msinp = m.sin(perpendicular);
      var cx1 = x1 - mcosp * useDist;
      var cy1 = y1 + msinp * useDist;
      var cx2 = x1 + mcosp * useDist;
      var cy2 = y1 - msinp * useDist;
      var cx3 = x2 + mcosp * useDist;
      var cy3 = y2 - msinp * useDist;
      var cx4 = x2 - mcosp * useDist;
      var cy4 = y2 + msinp * useDist;
      ctx.beginPath();
      ctx.moveTo(cx1, cy1);
      ctx.lineTo(cx4, cy4);
      ctx.moveTo(cx2, cy2);
      ctx.lineTo(cx3, cy3);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      break;
    }
  }
};
_.drawDecorations = function(ctx, specs) {
  if (this.isHover || this.isSelected) {
    var pi2 = 2 * m.PI;
    var angle = (this.a1.angleForStupidCanvasArcs(this.a2) + m.PI / 2) % pi2;
    ctx.strokeStyle = this.isHover ? specs.colorHover : specs.colorSelect;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    var angleTo = (angle + m.PI) % pi2;
    angleTo = angleTo % (m.PI * 2);
    ctx.arc(this.a1.x, this.a1.y, 7, angle, angleTo, false);
    ctx.stroke();
    ctx.beginPath();
    angle += m.PI;
    angleTo = (angle + m.PI) % pi2;
    ctx.arc(this.a2.x, this.a2.y, 7, angle, angleTo, false);
    ctx.stroke();
  }
};
_.drawLewisStyle = function(ctx, specs, x1, y1, x2, y2) {
  var angle = this.a1.angle(this.a2);
  var perp = angle + m.PI/2;
  var difx = x2 - x1;
  var dify = y2 - y1;
  var increment = m.sqrt(difx * difx + dify * dify) / (this.bondOrder + 1);
  var xi = increment * m.cos(angle);
  var yi = -increment * m.sin(angle);
  var x = x1 + xi;
  var y = y1 + yi;
  for ( var i = 0; i < this.bondOrder; i++) {
    var sep = specs.atoms_lonePairSpread_2D / 2;
    var cx1 = x - m.cos(perp) * sep;
    var cy1 = y + m.sin(perp) * sep;
    var cx2 = x + m.cos(perp) * sep;
    var cy2 = y - m.sin(perp) * sep;
    ctx.beginPath();
    ctx.arc(cx1 - specs.atoms_lonePairDiameter_2D / 2, cy1 - specs.atoms_lonePairDiameter_2D / 2, specs.atoms_lonePairDiameter_2D, 0, m.PI * 2, false);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx2 - specs.atoms_lonePairDiameter_2D / 2, cy2 - specs.atoms_lonePairDiameter_2D / 2, specs.atoms_lonePairDiameter_2D, 0, m.PI * 2, false);
    ctx.fill();
    x += xi;
    y += yi;
  }
};
/**
 * 
 * @param {WegGLRenderingContext}
 *            gl
 * @param {structures.VisualSpecifications}
 *            specs
 * @param {boolean}
 *            asSegments Using cylinder/solid line or segmented pills/dashed
 *            line
 * @return {void}
 */
_.render = function(gl, specs, asSegments) {
  if (this.specs) {
    specs = this.specs;
  }
  // this is the elongation vector for the cylinder
  var height = this.a1.distance3D(this.a2);
  if (height === 0) {
    // if there is no height, then no point in rendering this bond,
    // just return
    return;
  }

  // scale factor for cylinder/pill radius.
  // when scale pill, the cap will affected too.
  var radiusScale = specs.bonds_cylinderDiameter_3D / 2;

  // atom1 color and atom2 color
  var a1Color = specs.bonds_color;
  var a2Color;

  // transform to the atom as well as the opposite atom (for Jmol and
  // PyMOL
  // color splits)
  var transform = m4.translate(m4.identity(), [ this.a1.x, this.a1.y, this.a1.z ]);
  var transformOpposite;

  // vector from atom1 to atom2
  var a2b = [ this.a2.x - this.a1.x, this.a2.y - this.a1.y, this.a2.z - this.a1.z ];

  // calculate the rotation
  var y = [ 0, 1, 0 ];
  var ang = 0;
  var axis;
  if (this.a1.x === this.a2.x && this.a1.z === this.a2.z) {
    axis = [ 0, 0, 1 ];
    if (this.a2.y < this.a1.y) {
      ang = m.PI;
    }
  } else {
    ang = extensions.vec3AngleFrom(y, a2b);
    axis = v3.cross(y, a2b, []);
  }

  // the specs will split color are
  // - Line
  // - Stick
  // - Wireframe
  if (specs.bonds_splitColor) {
    var specs1 = this.a1.specs?this.a1.specs:specs;
    var specs2 = this.a2.specs?this.a2.specs:specs;
    a1Color = this.a1.getElementColor(specs1.atoms_useJMOLColors, specs1.atoms_usePYMOLColors, specs1.atoms_color);
    a2Color = this.a2.getElementColor(specs2.atoms_useJMOLColors, specs2.atoms_usePYMOLColors, specs2.atoms_color);

    // the transformOpposite will use for split color.
    // just make it splited if the color different.
    if (a1Color != a2Color) {
      transformOpposite = m4.translate(m4.identity(), [ this.a2.x, this.a2.y, this.a2.z ]);
    }
  }

  // calculate the translations for unsaturated bonds.
  // represenattio use saturatedCross are
  // - Line
  // - Wireframe
  // - Ball and Stick
  // just Stick will set bonds_showBondOrders_3D to false
  var others = [ 0 ];
  var saturatedCross;

  if (asSegments) { // block for draw bond as segmented line/pill

    if (specs.bonds_showBondOrders_3D && this.bondOrder > 1) {

      // The "0.5" part set here,
      // the other part (1) will render as cylinder
      others = [/*-specs.bonds_cylinderDiameter_3D, */specs.bonds_cylinderDiameter_3D ];

      var z = [ 0, 0, 1 ];
      var inverse = m4.inverse(gl.rotationMatrix, []);
      m4.multiplyVec3(inverse, z);
      saturatedCross = v3.cross(a2b, z, []);
      v3.normalize(saturatedCross);
    }

    var segmentScale = 1;

    var spaceBetweenPill = specs.bonds_pillSpacing_3D;

    var pillHeight = specs.bonds_pillHeight_3D;

    if (this.bondOrder == 0) {

      if (specs.bonds_renderAsLines_3D) {
        pillHeight = spaceBetweenPill;
      } else {
        pillHeight = specs.bonds_pillDiameter_3D;

        // Detect Ball and Stick representation
        if (pillHeight < specs.bonds_cylinderDiameter_3D) {
          pillHeight /= 2;
        }

        segmentScale = pillHeight / 2;
        height /= segmentScale;
        spaceBetweenPill /= segmentScale / 2;
      }

    }

    // total space need for one pill, iclude the space.
    var totalSpaceForPill = pillHeight + spaceBetweenPill;

    // segmented pills for one bond.
    var totalPillsPerBond = height / totalSpaceForPill;

    // segmented one unit pill for one bond
    var pillsPerBond = m.floor(totalPillsPerBond);

    var extraSegmentedSpace = height - totalSpaceForPill * pillsPerBond;

    var paddingSpace = (spaceBetweenPill + specs.bonds_pillDiameter_3D + extraSegmentedSpace) / 2;

    // pillSegmentsLength will change if both atom1 and atom2 color used
    // for rendering
    var pillSegmentsLength = pillsPerBond;

    if (transformOpposite) {
      // floor will effected for odd pills, because one pill at the
      // center
      // will replace with splited pills
      pillSegmentsLength = m.floor(pillsPerBond / 2);
    }

    // render bonds
    for ( var i = 0, ii = others.length; i < ii; i++) {
      var transformUse = m4.set(transform, []);

      if (others[i] !== 0) {
        m4.translate(transformUse, v3.scale(saturatedCross, others[i], []));
      }
      if (ang !== 0) {
        m4.rotate(transformUse, ang, axis);
      }

      if (segmentScale != 1) {
        m4.scale(transformUse, [ segmentScale, segmentScale, segmentScale ]);
      }

      // colors
      if (a1Color)
        gl.material.setDiffuseColor(gl, a1Color);

      m4.translate(transformUse, [ 0, paddingSpace, 0 ]);

      for ( var j = 0; j < pillSegmentsLength; j++) {

        if (specs.bonds_renderAsLines_3D) {
          if (this.bondOrder == 0) {
            gl.shader.setMatrixUniforms(gl, transformUse);
            gl.drawArrays(gl.POINTS, 0, 1);
          } else {
            m4.scale(transformUse, [ 1, pillHeight, 1 ]);

            gl.shader.setMatrixUniforms(gl, transformUse);
            gl.drawArrays(gl.LINES, 0, gl.lineBuffer.vertexPositionBuffer.numItems);

            m4.scale(transformUse, [ 1, 1 / pillHeight, 1 ]);
          }
        } else {
          gl.shader.setMatrixUniforms(gl, transformUse);
          if (this.bondOrder == 0) {
            gl.drawElements(gl.TRIANGLES, gl.sphereBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
          } else {
            gl.drawElements(gl.TRIANGLES, gl.pillBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
          }
        }

        m4.translate(transformUse, [ 0, totalSpaceForPill, 0 ]);
      }

      // if rendering segmented pill use atom1 and atom2 color
      if (transformOpposite) {
        // parameter for calculate splited pills
        var scaleY, halfOneMinScaleY;

        if (specs.bonds_renderAsLines_3D) {
          scaleY = pillHeight;
          // if(this.bondOrder != 0) {
          // scaleY -= spaceBetweenPill;
          // }
          scaleY /= 2;
          halfOneMinScaleY = 0;
        } else {
          scaleY = 2 / 3;
          halfOneMinScaleY = (1 - scaleY) / 2;
        }

        // if count of pills per bound is odd,
        // then draw the splited pills of atom1
        if (pillsPerBond % 2 != 0) {

          m4.scale(transformUse, [ 1, scaleY, 1 ]);

          gl.shader.setMatrixUniforms(gl, transformUse);

          if (specs.bonds_renderAsLines_3D) {

            if (this.bondOrder == 0) {
              gl.drawArrays(gl.POINTS, 0, 1);
            } else {
              gl.drawArrays(gl.LINES, 0, gl.lineBuffer.vertexPositionBuffer.numItems);
            }

          } else {

            if (this.bondOrder == 0) {
              gl.drawElements(gl.TRIANGLES, gl.sphereBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            } else {
              gl.drawElements(gl.TRIANGLES, gl.pillBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            }

          }

          m4.translate(transformUse, [ 0, totalSpaceForPill * (1 + halfOneMinScaleY), 0 ]);

          m4.scale(transformUse, [ 1, 1 / scaleY, 1 ]);
        }

        // prepare to render the atom2

        m4.set(transformOpposite, transformUse);
        if (others[i] !== 0) {
          m4.translate(transformUse, v3.scale(saturatedCross, others[i], []));
        }
        // don't check for 0 here as that means it should be rotated
        // by PI, but PI will be negated
        m4.rotate(transformUse, ang + m.PI, axis);

        if (segmentScale != 1) {
          m4.scale(transformUse, [ segmentScale, segmentScale, segmentScale ]);
        }

        // colors
        if (a2Color){
          gl.material.setDiffuseColor(gl, a2Color);
        }

        m4.translate(transformUse, [ 0, paddingSpace, 0 ]);

        // draw the remain pills which use the atom2 color
        for ( var j = 0; j < pillSegmentsLength; j++) {

          if (specs.bonds_renderAsLines_3D) {
            if (this.bondOrder == 0) {
              gl.shader.setMatrixUniforms(gl, transformUse);
              gl.drawArrays(gl.POINTS, 0, 1);
            } else {
              m4.scale(transformUse, [ 1, pillHeight, 1 ]);

              gl.shader.setMatrixUniforms(gl, transformUse);
              gl.drawArrays(gl.LINES, 0, gl.lineBuffer.vertexPositionBuffer.numItems);

              m4.scale(transformUse, [ 1, 1 / pillHeight, 1 ]);
            }
          } else {
            gl.shader.setMatrixUniforms(gl, transformUse);
            if (this.bondOrder == 0) {
              gl.drawElements(gl.TRIANGLES, gl.sphereBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            } else {
              gl.drawElements(gl.TRIANGLES, gl.pillBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            }
          }

          m4.translate(transformUse, [ 0, totalSpaceForPill, 0 ]);
        }

        // draw the splited center pills of atom2
        if (pillsPerBond % 2 != 0) {

          m4.scale(transformUse, [ 1, scaleY, 1 ]);

          gl.shader.setMatrixUniforms(gl, transformUse);

          if (specs.bonds_renderAsLines_3D) {

            if (this.bondOrder == 0) {
              gl.drawArrays(gl.POINTS, 0, 1);
            } else {
              gl.drawArrays(gl.LINES, 0, gl.lineBuffer.vertexPositionBuffer.numItems);
            }

          } else {

            if (this.bondOrder == 0) {
              gl.drawElements(gl.TRIANGLES, gl.sphereBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            } else {
              gl.drawElements(gl.TRIANGLES, gl.pillBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            }

          }

          m4.translate(transformUse, [ 0, totalSpaceForPill * (1 + halfOneMinScaleY), 0 ]);

          m4.scale(transformUse, [ 1, 1 / scaleY, 1 ]);
        }
      }
    }
  } else {
    // calculate the translations for unsaturated bonds.
    // represenation that use saturatedCross are
    // - Line
    // - Wireframe
    // - Ball and Stick
    // just Stick will set bonds_showBondOrders_3D to false
    if (specs.bonds_showBondOrders_3D) {

      switch (this.bondOrder) {
      // the 0 and 0.5 bond order will draw as segmented pill.
      // so we not set that here.
      // case 0:
      // case 0.5: break;

      case 1.5:
        // The "1" part set here,
        // the other part (0.5) will render as segmented pill
        others = [ -specs.bonds_cylinderDiameter_3D /*
                                * ,
                                * specs.bonds_cylinderDiameter_3D
                                */];
        break;
      case 2:
        others = [ -specs.bonds_cylinderDiameter_3D, specs.bonds_cylinderDiameter_3D ];
        break;
      case 3:
        others = [ -1.2 * specs.bonds_cylinderDiameter_3D, 0, 1.2 * specs.bonds_cylinderDiameter_3D ];
        break;
      }

      // saturatedCross just need for need for bondorder greather than
      // 1
      if (this.bondOrder > 1) {
        var z = [ 0, 0, 1 ];
        var inverse = m4.inverse(gl.rotationMatrix, []);
        m4.multiplyVec3(inverse, z);
        saturatedCross = v3.cross(a2b, z, []);
        v3.normalize(saturatedCross);
      }
    }
    // for Stick representation, we just change the cylinder radius
    else {

      switch (this.bondOrder) {
      case 0:
        radiusScale *= 0.25;
        break;
      case 0.5:
      case 1.5:
        radiusScale *= 0.5;
        break;
      }
    }

    // if transformOpposite is set, the it mean the color must be
    // splited.
    // so the heigh of cylinder will be half.
    // one half for atom1 color the other for atom2 color
    if (transformOpposite) {
      height /= 2;
    }

    // Radius of cylinder already defined when initialize cylinder mesh,
    // so at this rate, the scale just needed for Y to strech
    // cylinder to bond length (height) and X and Z for radius.
    var scaleVector = [ radiusScale, height, radiusScale ];

    // render bonds
    for ( var i = 0, ii = others.length; i < ii; i++) {
      var transformUse = m4.set(transform, []);
      if (others[i] !== 0) {
        m4.translate(transformUse, v3.scale(saturatedCross, others[i], []));
      }
      if (ang !== 0) {
        m4.rotate(transformUse, ang, axis);
      }
      m4.scale(transformUse, scaleVector);

      // colors
      if (a1Color)
        gl.material.setDiffuseColor(gl, a1Color);

      // render
      gl.shader.setMatrixUniforms(gl, transformUse);
      if (specs.bonds_renderAsLines_3D) {
        gl.drawArrays(gl.LINES, 0, gl.lineBuffer.vertexPositionBuffer.numItems);
      } else {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.cylinderBuffer.vertexPositionBuffer.numItems);
      }

      // if transformOpposite is set, then a2Color also shoudl be
      // seted as well.
      if (transformOpposite) {
        m4.set(transformOpposite, transformUse);
        if (others[i] !== 0) {
          m4.translate(transformUse, v3.scale(saturatedCross, others[i], []));
        }
        // don't check for 0 here as that means it should be rotated
        // by PI, but PI will be negated
        m4.rotate(transformUse, ang + m.PI, axis);
        m4.scale(transformUse, scaleVector);

        // colors
        if (a2Color)
          gl.material.setDiffuseColor(gl, a2Color);

        // render
        gl.shader.setMatrixUniforms(gl, transformUse);
        if (specs.bonds_renderAsLines_3D) {
          gl.drawArrays(gl.LINES, 0, gl.lineBuffer.vertexPositionBuffer.numItems);
        } else {
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.cylinderBuffer.vertexPositionBuffer.numItems);
        }
      }
    }
  }
};
_.renderHighlight = function(gl, specs) {
  if (this.isSelected || this.isHover) {
    if (this.specs) {
      specs = this.specs;
    }
    if (this.specs) {
      specs = this.specs;
    }
    // this is the elongation vector for the cylinder
    var height = this.a1.distance3D(this.a2);
    if (height === 0) {
      // if there is no height, then no point in rendering this bond,
      // just return
      return;
    }

    // scale factor for cylinder/pill radius.
    // when scale pill, the cap will affected too.
    var radiusScale = specs.bonds_cylinderDiameter_3D / 1.2;
    var transform = m4.translate(m4.identity(), [ this.a1.x, this.a1.y, this.a1.z ]);

    // vector from atom1 to atom2
    var a2b = [ this.a2.x - this.a1.x, this.a2.y - this.a1.y, this.a2.z - this.a1.z ];

    // calculate the rotation
    var y = [ 0, 1, 0 ];
    var ang = 0;
    var axis;
    if (this.a1.x === this.a2.x && this.a1.z === this.a2.z) {
      axis = [ 0, 0, 1 ];
      if (this.a2.y < this.a1.y) {
        ang = m.PI;
      }
    } else {
      ang = extensions.vec3AngleFrom(y, a2b);
      axis = v3.cross(y, a2b, []);
    }
    var scaleVector = [ radiusScale, height, radiusScale ];
    
    if (ang !== 0) {
      m4.rotate(transform, ang, axis);
    }
    m4.scale(transform, scaleVector);
    gl.shader.setMatrixUniforms(gl, transform);
    gl.material.setDiffuseColor(gl, this.isHover ? specs.colorHover : specs.colorSelect);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.cylinderBuffer.vertexPositionBuffer.numItems);
  }
};
/**
 * 
 * @param {WegGLRenderingContext}
 *            gl
 * @param {structures.VisualSpecifications}
 *            specs
 * @return {void}
 */
_.renderPicker = function(gl, specs) {

  // gl.cylinderBuffer.bindBuffers(gl);
  // gl.material.setDiffuseColor(
  // this.bondOrder == 0 ? '#FF0000' : // merah
  // this.bondOrder == 0.5 ? '#FFFF00' : // kuning
  // this.bondOrder == 1 ? '#FF00FF' : // ungu
  // this.bondOrder == 1.5 ? '#00FF00' : // hijau
  // this.bondOrder == 2 ? '#00FFFF' : // cyan
  // this.bondOrder == 3 ? '#0000FF' : // biru
  // '#FFFFFF');
  // gl.material.setAlpha(1);

  if (this.specs) {
    specs = this.specs;
  }
  // this is the elongation vector for the cylinder
  var height = this.a1.distance3D(this.a2);
  if (height === 0) {
    // if there is no height, then no point in rendering this bond,
    // just return
    return;
  }

  // scale factor for cylinder/pill radius.
  // when scale pill, the cap will affected too.
  var radiusScale = specs.bonds_cylinderDiameter_3D / 2;

  // transform to the atom as well as the opposite atom (for Jmol and
  // PyMOL
  // color splits)
  var transform = m4.translate(m4.identity(), [ this.a1.x, this.a1.y, this.a1.z ]);

  // vector from atom1 to atom2
  var a2b = [ this.a2.x - this.a1.x, this.a2.y - this.a1.y, this.a2.z - this.a1.z ];

  // calculate the rotation
  var y = [ 0, 1, 0 ];
  var ang = 0;
  var axis;
  if (this.a1.x === this.a2.x && this.a1.z === this.a2.z) {
    axis = [ 0, 0, 1 ];
    if (this.a2.y < this.a1.y) {
      ang = m.PI;
    }
  } else {
    ang = extensions.vec3AngleFrom(y, a2b);
    axis = v3.cross(y, a2b, []);
  }

  // calculate the translations for unsaturated bonds.
  // represenattio use saturatedCross are
  // - Line
  // - WIreframe
  // - Ball and Stick
  // just Stick will set bonds_showBondOrders_3D to false
  var others = [ 0 ];
  var saturatedCross;

  if (specs.bonds_showBondOrders_3D) {

    if (specs.bonds_renderAsLines_3D) {

      switch (this.bondOrder) {

      case 1.5:
      case 2:
        others = [ -specs.bonds_cylinderDiameter_3D, specs.bonds_cylinderDiameter_3D ];
        break;
      case 3:
        others = [ -1.2 * specs.bonds_cylinderDiameter_3D, 0, 1.2 * specs.bonds_cylinderDiameter_3D ];
        break;
      }

      // saturatedCross just need for need for bondorder greather than
      // 1
      if (this.bondOrder > 1) {
        var z = [ 0, 0, 1 ];
        var inverse = m4.inverse(gl.rotationMatrix, []);
        m4.multiplyVec3(inverse, z);
        saturatedCross = v3.cross(a2b, z, []);
        v3.normalize(saturatedCross);
      }

    } else {

      switch (this.bondOrder) {
      case 1.5:
      case 2:
        radiusScale *= 3;
        break;
      case 3:
        radiusScale *= 3.4;
        break;
      }

    }

  } else {
    // this is for Stick repersentation because Stick not have
    // bonds_showBondOrders_3D

    switch (this.bondOrder) {

    case 0:
      radiusScale *= 0.25;
      break;
    case 0.5:
    case 1.5:
      radiusScale *= 0.5;
      break;
    }

  }

  // Radius of cylinder already defined when initialize cylinder mesh,
  // so at this rate, the scale just needed for Y to strech
  // cylinder to bond length (height) and X and Z for radius.
  var scaleVector = [ radiusScale, height, radiusScale ];

  // render bonds
  for ( var i = 0, ii = others.length; i < ii; i++) {
    var transformUse = m4.set(transform, []);
    if (others[i] !== 0) {
      m4.translate(transformUse, v3.scale(saturatedCross, others[i], []));
    }
    if (ang !== 0) {
      m4.rotate(transformUse, ang, axis);
    }
    m4.scale(transformUse, scaleVector);

    // render
    gl.shader.setMatrixUniforms(gl, transformUse);
    if (specs.bonds_renderAsLines_3D) {
      gl.drawArrays(gl.LINES, 0, gl.lineBuffer.vertexPositionBuffer.numItems);
    } else {
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.cylinderBuffer.vertexPositionBuffer.numItems);
    }

  }
};

