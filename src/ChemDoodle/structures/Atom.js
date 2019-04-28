import { ELEMENT } from '../../ChemDoodle';
import * as extensions from '../extensions';
import * as math from '../math';
import { mat4 as m4 } from '../lib';
import Point from './Point';
import CondensedLabel from './CondensedLabel';
const m = Math;

export default function Atom(label, x, y, z) {
  this.label = label ? label.replace(/\s/g, '') : 'C';
  this.x = x ? x : 0;
  this.y = y ? y : 0;
  this.z = z ? z : 0;
};
var _ = Atom.prototype = new Point(0, 0);
_.charge = 0;
_.numLonePair = 0;
_.numRadical = 0;
_.mass = -1;
_.implicitH = -1;
_.coordinationNumber = 0;
_.bondNumber = 0;
_.angleOfLeastInterference = 0;
_.isHidden = false;
_.altLabel = undefined;
_.isLone = false;
_.isHover = false;
_.isSelected = false;
_.add3D = function(p) {
  this.x += p.x;
  this.y += p.y;
  this.z += p.z;
};
_.sub3D = function(p) {
  this.x -= p.x;
  this.y -= p.y;
  this.z -= p.z;
};
_.distance3D = function(p) {
  var dx = p.x - this.x;
  var dy = p.y - this.y;
  var dz = p.z - this.z;
  return m.sqrt(dx * dx + dy * dy + dz * dz);
};
_.draw = function(ctx, specs) {
  if(this.dontDraw){
    // this is used when the atom shouldn't be visible, such as when the text input field is open over this atom
    return;
  }
  if (this.isLassoed) {
    var grd = ctx.createRadialGradient(this.x - 1, this.y - 1, 0, this.x, this.y, 7);
    grd.addColorStop(0, 'rgba(212, 99, 0, 0)');
    grd.addColorStop(0.7, 'rgba(212, 99, 0, 0.8)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, m.PI * 2, false);
    ctx.fill();
  }
  if(this.query){
    return;
  }
  this.textBounds = [];
  if (this.specs) {
    specs = this.specs;
  }
  var font = extensions.getFontString(specs.atoms_font_size_2D, specs.atoms_font_families_2D, specs.atoms_font_bold_2D, specs.atoms_font_italic_2D);
  ctx.font = font;
  ctx.fillStyle = this.getElementColor(specs.atoms_useJMOLColors, specs.atoms_usePYMOLColors, specs.atoms_color, 2);
  if(this.label==='H' && specs.atoms_HBlack_2D){
    ctx.fillStyle = 'black';
  }
  if(this.error){
    ctx.fillStyle = specs.colorError;
  }
  var hAngle;
  var labelVisible = this.isLabelVisible(specs);
  if (this.isLone && !labelVisible || specs.atoms_circles_2D) {
    // always use carbon gray for lone carbon atom dots
    if(this.isLone){
      ctx.fillStyle = '#909090';
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, specs.atoms_circleDiameter_2D / 2, 0, m.PI * 2, false);
    ctx.fill();
    if (specs.atoms_circleBorderWidth_2D > 0) {
      ctx.lineWidth = specs.atoms_circleBorderWidth_2D;
      ctx.strokeStyle = 'black';
      ctx.stroke();
    }
  } else if (labelVisible) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // keep check to undefined here as dev may set altLabel to empty
    // string
    if (this.altLabel !== undefined) {
      // altLabel can be 0, so check if undefined
      ctx.fillText(this.altLabel, this.x, this.y);
      var symbolWidth = ctx.measureText(this.altLabel).width;
      this.textBounds.push({
        x : this.x - symbolWidth / 2,
        y : this.y - specs.atoms_font_size_2D / 2 + 1,
        w : symbolWidth,
        h : specs.atoms_font_size_2D - 2
      });
    }else if(!ELEMENT[this.label]){
      if(CondensedLabel){
        // CondensedLabel is proprietary and not included in the GPL version
        if(!this.condensed || this.condensed.text !== this.label){
          this.condensed = new CondensedLabel(this, this.label);
        }
        this.condensed.draw(ctx, specs);
      }else{
        ctx.fillText(this.label, this.x, this.y);
        var symbolWidth = ctx.measureText(this.label).width;
        this.textBounds.push({
          x : this.x - symbolWidth / 2,
          y : this.y - specs.atoms_font_size_2D / 2 + 1,
          w : symbolWidth,
          h : specs.atoms_font_size_2D - 2
        });
      }
    } else {
      ctx.fillText(this.label, this.x, this.y);
      var symbolWidth = ctx.measureText(this.label).width;
      this.textBounds.push({
        x : this.x - symbolWidth / 2,
        y : this.y - specs.atoms_font_size_2D / 2 + 1,
        w : symbolWidth,
        h : specs.atoms_font_size_2D - 2
      });
      // mass
      var massWidth = 0;
      if (this.mass !== -1) {
        var fontSave = ctx.font;
        ctx.font = extensions.getFontString(specs.atoms_font_size_2D * .7, specs.atoms_font_families_2D, specs.atoms_font_bold_2D, specs.atoms_font_italic_2D);
        massWidth = ctx.measureText(this.mass).width;
        ctx.fillText(this.mass, this.x - massWidth - .5, this.y - specs.atoms_font_size_2D / 2 + 1);
        this.textBounds.push({
          x : this.x - symbolWidth / 2 - massWidth - .5,
          y : this.y - (specs.atoms_font_size_2D * 1.7) / 2 + 1,
          w : massWidth,
          h : specs.atoms_font_size_2D / 2 - 1
        });
        ctx.font = fontSave;
      }
      // implicit hydrogens
      var chargeOffset = symbolWidth / 2;
      var numHs = this.getImplicitHydrogenCount();
      if (specs.atoms_implicitHydrogens_2D && numHs > 0) {
        hAngle = 0;
        var hWidth = ctx.measureText('H').width;
        var moveCharge = true;
        if (numHs > 1) {
          var xoffset = symbolWidth / 2 + hWidth / 2;
          var yoffset = 0;
          var subFont = extensions.getFontString(specs.atoms_font_size_2D * .8, specs.atoms_font_families_2D, specs.atoms_font_bold_2D, specs.atoms_font_italic_2D);
          ctx.font = subFont;
          var numWidth = ctx.measureText(numHs).width;
          if (this.bondNumber === 1) {
            if (this.angleOfLeastInterference > m.PI / 2 && this.angleOfLeastInterference < 3 * m.PI / 2) {
              xoffset = -symbolWidth / 2 - numWidth - hWidth / 2 - massWidth / 2;
              moveCharge = false;
              hAngle = m.PI;
            }
          } else {
            if (this.angleOfLeastInterference <= m.PI / 4) {
              // default
            } else if (this.angleOfLeastInterference < 3 * m.PI / 4) {
              xoffset = 0;
              yoffset = -specs.atoms_font_size_2D * .9;
              if (this.charge !== 0) {
                yoffset -= specs.atoms_font_size_2D * .3;
              }
              moveCharge = false;
              hAngle = m.PI / 2;
            } else if (this.angleOfLeastInterference <= 5 * m.PI / 4) {
              xoffset = -symbolWidth / 2 - numWidth - hWidth / 2 - massWidth / 2;
              moveCharge = false;
              hAngle = m.PI;
            } else if (this.angleOfLeastInterference < 7 * m.PI / 4) {
              xoffset = 0;
              yoffset = specs.atoms_font_size_2D * .9;
              moveCharge = false;
              hAngle = 3 * m.PI / 2;
            }
          }
          ctx.font = font;
          ctx.fillText('H', this.x + xoffset, this.y + yoffset);
          ctx.font = subFont;
          ctx.fillText(numHs, this.x + xoffset + hWidth / 2 + numWidth / 2, this.y + yoffset + specs.atoms_font_size_2D * .3);
          this.textBounds.push({
            x : this.x + xoffset - hWidth / 2,
            y : this.y + yoffset - specs.atoms_font_size_2D / 2 + 1,
            w : hWidth,
            h : specs.atoms_font_size_2D - 2
          });
          this.textBounds.push({
            x : this.x + xoffset + hWidth / 2,
            y : this.y + yoffset + specs.atoms_font_size_2D * .3 - specs.atoms_font_size_2D / 2 + 1,
            w : numWidth,
            h : specs.atoms_font_size_2D * .8 - 2
          });
        } else {
          var xoffset = symbolWidth / 2 + hWidth / 2;
          var yoffset = 0;
          if (this.bondNumber === 1) {
            if (this.angleOfLeastInterference > m.PI / 2 && this.angleOfLeastInterference < 3 * m.PI / 2) {
              xoffset = -symbolWidth / 2 - hWidth / 2 - massWidth / 2;
              moveCharge = false;
              hAngle = m.PI;
            }
          } else {
            if (this.angleOfLeastInterference <= m.PI / 4) {
              // default
            } else if (this.angleOfLeastInterference < 3 * m.PI / 4) {
              xoffset = 0;
              yoffset = -specs.atoms_font_size_2D * .9;
              moveCharge = false;
              hAngle = m.PI / 2;
            } else if (this.angleOfLeastInterference <= 5 * m.PI / 4) {
              xoffset = -symbolWidth / 2 - hWidth / 2 - massWidth / 2;
              moveCharge = false;
              hAngle = m.PI;
            } else if (this.angleOfLeastInterference < 7 * m.PI / 4) {
              xoffset = 0;
              yoffset = specs.atoms_font_size_2D * .9;
              moveCharge = false;
              hAngle = 3 * m.PI / 2;
            }
          }
          ctx.fillText('H', this.x + xoffset, this.y + yoffset);
          this.textBounds.push({
            x : this.x + xoffset - hWidth / 2,
            y : this.y + yoffset - specs.atoms_font_size_2D / 2 + 1,
            w : hWidth,
            h : specs.atoms_font_size_2D - 2
          });
        }
        if (moveCharge) {
          chargeOffset += hWidth;
        }
        // adjust the angles metadata to account for hydrogen
        // placement
        /*
          * this.angles.push(hAngle); var angleData =
          * math.angleBetweenLargest(this.angles);
          * this.angleOfLeastInterference = angleData.angle % (m.PI *
          * 2); this.largestAngle = angleData.largest;
          */
      }
      // charge
      if (this.charge !== 0) {
        var s = this.charge.toFixed(0);
        if (s === '1') {
          s = '+';
        } else if (s === '-1') {
          s = '\u2013';
        } else if (extensions.stringStartsWith(s, '-')) {
          s = s.substring(1) + '\u2013';
        } else {
          s += '+';
        }
        var chargeWidth = ctx.measureText(s).width;
        chargeOffset += chargeWidth / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = extensions.getFontString(m.floor(specs.atoms_font_size_2D * .8), specs.atoms_font_families_2D, specs.atoms_font_bold_2D, specs.atoms_font_italic_2D);
        ctx.fillText(s, this.x + chargeOffset - 1, this.y - specs.atoms_font_size_2D / 2 + 1);
        this.textBounds.push({
          x : this.x + chargeOffset - chargeWidth / 2 - 1,
          y : this.y - (specs.atoms_font_size_2D * 1.8) / 2 + 5,
          w : chargeWidth,
          h : specs.atoms_font_size_2D / 2 - 1
        });
      }
    }
  }
  if (this.numLonePair > 0 || this.numRadical > 0) {
    ctx.fillStyle = 'black';
    var as = this.angles.slice(0);
    var ali = this.angleOfLeastInterference;
    var la = this.largestAngle;
    if (hAngle !== undefined) {
      // have to check for undefined here as this number can be 0
      as.push(hAngle);
      as.sort(function(a, b) {
        return a - b;
      });
      var angleData = math.angleBetweenLargest(as);
      ali = angleData.angle % (m.PI * 2);
      la = angleData.largest;
    }
    var things = [];
    for ( var i = 0; i < this.numLonePair; i++) {
      things.push({
        t : 2
      });
    }
    for ( var i = 0; i < this.numRadical; i++) {
      things.push({
        t : 1
      });
    }
    if (hAngle === undefined && m.abs(la - 2 * m.PI / as.length) < m.PI / 60) {
      var mid = m.ceil(things.length / as.length);
      for ( var i = 0, ii = things.length; i < ii; i += mid, ali += la) {
        this.drawElectrons(ctx, specs, things.slice(i, m.min(things.length, i + mid)), ali, la, hAngle);
      }
    } else {
      this.drawElectrons(ctx, specs, things, ali, la, hAngle);
    }
  }
  // for debugging atom label dimensions
  //ctx.strokeStyle = 'red'; for(var i = 0, ii = this.textBounds.length;i<ii; i++){ var r = this.textBounds[i];ctx.beginPath();ctx.rect(r.x, r.y, r.w, r.h); ctx.stroke(); }

};
_.drawElectrons = function(ctx, specs, things, angle, largest, hAngle) {
  var segment = largest / (things.length + (this.bonds.length === 0 && hAngle === undefined ? 0 : 1));
  var angleStart = angle - largest / 2 + segment;
  for ( var i = 0; i < things.length; i++) {
    var t = things[i];
    var angle = angleStart + i * segment;
    var p1x = this.x + Math.cos(angle) * specs.atoms_lonePairDistance_2D;
    var p1y = this.y - Math.sin(angle) * specs.atoms_lonePairDistance_2D;
    if (t.t === 2) {
      var perp = angle + Math.PI / 2;
      var difx = Math.cos(perp) * specs.atoms_lonePairSpread_2D / 2;
      var dify = -Math.sin(perp) * specs.atoms_lonePairSpread_2D / 2;
      ctx.beginPath();
      ctx.arc(p1x + difx, p1y + dify, specs.atoms_lonePairDiameter_2D, 0, m.PI * 2, false);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p1x - difx, p1y - dify, specs.atoms_lonePairDiameter_2D, 0, m.PI * 2, false);
      ctx.fill();
    } else if (t.t === 1) {
      ctx.beginPath();
      ctx.arc(p1x, p1y, specs.atoms_lonePairDiameter_2D, 0, m.PI * 2, false);
      ctx.fill();
    }
  }
};
_.drawDecorations = function(ctx, specs) {
  if (this.isHover || this.isSelected) {
    ctx.strokeStyle = this.isHover ? specs.colorHover : specs.colorSelect;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    var radius = this.isHover ? 7 : 15;
    ctx.arc(this.x, this.y, radius, 0, m.PI * 2, false);
    ctx.stroke();
  }
  if (this.isOverlap) {
    ctx.strokeStyle = specs.colorError;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 7, 0, m.PI * 2, false);
    ctx.stroke();
  }
};
_.render = function(gl, specs, noColor) {
  if (this.specs) {
    specs = this.specs;
  }
  var transform = m4.translate(m4.identity(), [ this.x, this.y, this.z ]);
  var radius = specs.atoms_useVDWDiameters_3D ? ELEMENT[this.label].vdWRadius * specs.atoms_vdwMultiplier_3D : specs.atoms_sphereDiameter_3D / 2;
  if (radius === 0) {
    radius = 1;
  }
  m4.scale(transform, [ radius, radius, radius ]);

  // colors
  if (!noColor) {
    var color = specs.atoms_color;
    if (specs.atoms_useJMOLColors) {
      color = ELEMENT[this.label].jmolColor;
    } else if (specs.atoms_usePYMOLColors) {
      color = ELEMENT[this.label].pymolColor;
    }
    gl.material.setDiffuseColor(gl, color);
  }

  // render
  gl.shader.setMatrixUniforms(gl, transform);
  var buffer = this.renderAsStar ? gl.starBuffer : gl.sphereBuffer;
  gl.drawElements(gl.TRIANGLES, buffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
};
_.renderHighlight = function(gl, specs) {
  if (this.isSelected || this.isHover) {
    if (this.specs) {
      specs = this.specs;
    }
    var transform = m4.translate(m4.identity(), [ this.x, this.y, this.z ]);
    var radius = specs.atoms_useVDWDiameters_3D ? ELEMENT[this.label].vdWRadius * specs.atoms_vdwMultiplier_3D : specs.atoms_sphereDiameter_3D / 2;
    if (radius === 0) {
      radius = 1;
    }
    radius *= 1.3;
    m4.scale(transform, [ radius, radius, radius ]);

    gl.shader.setMatrixUniforms(gl, transform);
    gl.material.setDiffuseColor(gl, this.isHover ? specs.colorHover : specs.colorSelect);
    var buffer = this.renderAsStar ? gl.starBuffer : gl.sphereBuffer;
    gl.drawElements(gl.TRIANGLES, buffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  }
};
_.isLabelVisible = function(specs) {
  if (specs.atoms_displayAllCarbonLabels_2D) {
    // show all carbons
    return true;
  }
  if (this.label !== 'C') {
    // not a carbon
    return true;
  }
  if (this.altLabel || !ELEMENT[this.label]) {
    // there is an alternative or condensed label
    return true;
  }
  if (this.mass !== -1 || this.implicitH !==-1 || this.charge !== 0) {
    // an isotope or charge or implicit hydrogen override designation, so label must be shown
    return true;
  }
  if (specs.atoms_showAttributedCarbons_2D && (this.numRadical !== 0 || this.numLonePair !== 0)) {
    // there are attributes and we want to show the associated label
    return true;
  }
  if (this.isHidden && specs.atoms_showHiddenCarbons_2D) {
    // if it is hidden and we want to show them
    return true;
  }
  if (specs.atoms_displayTerminalCarbonLabels_2D && this.bondNumber === 1) {
    // if it is terminal and we want to show them
    return true;
  }
  return false;
};
_.getImplicitHydrogenCount = function() {
  if(!ELEMENT[this.label] || !ELEMENT[this.label].addH){
    return 0;
  }
  if(this.implicitH !== -1){
    return this.implicitH;
  }
  if (this.label === 'H') {
    return 0;
  }
  var valence = ELEMENT[this.label].valency;
  var dif = valence - this.coordinationNumber;
  if (this.numRadical > 0) {
    dif = m.max(0, dif - this.numRadical);
  }
  if (this.charge > 0) {
    var vdif = 4 - valence;
    if (this.charge <= vdif) {
      dif += this.charge;
    } else {
      dif = 4 - this.coordinationNumber - this.charge + vdif;
    }
  } else {
    dif += this.charge;
  }
  return dif < 0 ? 0 : m.floor(dif);
};
_.getBounds = function() {
  var bounds = new math.Bounds();
  bounds.expand(this.x, this.y);
  if (this.textBounds) {
    for ( var i = 0, ii = this.textBounds.length; i < ii; i++) {
      var tb = this.textBounds[i];
      bounds.expand(tb.x, tb.y, tb.x + tb.w, tb.y + tb.h);
    }
  }
  return bounds;
};
_.getBounds3D = function() {
  var bounds = new math.Bounds();
  bounds.expand3D(this.x, this.y, this.z);
  return bounds;
};
/**
 * Get Color by atom element.
 * 
 * @param {boolean}
 *            useJMOLColors
 * @param {boolean}
 *            usePYMOLColors
 * @param {string}
 *            color The default color
 * @param {number}
 *            dim The render dimension
 * @return {string} The atom element color
 */
_.getElementColor = function(useJMOLColors, usePYMOLColors, color) {
  if(!ELEMENT[this.label]){
    return '#000';
  }
  if (useJMOLColors) {
    color = ELEMENT[this.label].jmolColor;
  } else if (usePYMOLColors) {
    color = ELEMENT[this.label].pymolColor;
  }
  return color;
};
