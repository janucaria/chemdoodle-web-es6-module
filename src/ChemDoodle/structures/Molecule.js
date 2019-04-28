import Queue from './Queue';
import Point from './Point';
import Atom from './Atom';
import Bond from './Bond';
import VisualSpecifications from './VisualSpecifications';
import { RESIDUE } from '../../ChemDoodle';
import { SSSRFinder } from "../informatics";
import * as math from '../math';

const m = Math;

export default function Molecule() {
  this.atoms = [];
  this.bonds = [];
  this.rings = [];
};
var _ = Molecule.prototype;
// this can be an extensive algorithm for large molecules, you may want
// to turn this off
_.findRings = true;
_.draw = function(ctx, specs) {
  if (this.specs) {
    specs = this.specs;
  }
  // draw
  // need this weird render of atoms before and after, just in case
  // circles are rendered, as those should be on top
  if (specs.atoms_display && !specs.atoms_circles_2D) {
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      this.atoms[i].draw(ctx, specs);
    }
  }
  if (specs.bonds_display) {
    for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
      this.bonds[i].draw(ctx, specs);
    }
  }
  if (specs.atoms_display) {
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      var a = this.atoms[i];
      if(specs.atoms_circles_2D){
        a.draw(ctx, specs);
      }
      if(a.query){
        a.query.draw(ctx, specs, a);
      }
    }
  }
};
_.render = function(gl, specs) {
  // uncomment this to render the picking frame
  // return this.renderPickFrame(gl, specs, []);
  if (this.specs) {
    specs = this.specs;
  }
  // check explicitly if it is undefined here, since hetatm is a
  // boolean that can be true or false, as long as it is set, it is
  // macro
  var isMacro = this.atoms.length > 0 && this.atoms[0].hetatm !== undefined;
  if (isMacro) {
    if (specs.macro_displayBonds) {
      if (this.bonds.length > 0) {
        if (specs.bonds_renderAsLines_3D && !this.residueSpecs || this.residueSpecs && this.residueSpecs.bonds_renderAsLines_3D) {
          gl.lineWidth(this.residueSpecs ? this.residueSpecs.bonds_width_2D : specs.bonds_width_2D);
          gl.lineBuffer.bindBuffers(gl);
        } else {
          gl.cylinderBuffer.bindBuffers(gl);
        }
        // colors
        gl.material.setTempColors(gl, specs.bonds_materialAmbientColor_3D, undefined, specs.bonds_materialSpecularColor_3D, specs.bonds_materialShininess_3D);
      }
      for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
        var b = this.bonds[i];
        // closestDistance may be 0, so check if undefined
        if (!b.a1.hetatm && (specs.macro_atomToLigandDistance === -1 || (b.a1.closestDistance !== undefined && specs.macro_atomToLigandDistance >= b.a1.closestDistance && specs.macro_atomToLigandDistance >= b.a2.closestDistance))) {
          b.render(gl, this.residueSpecs ? this.residueSpecs : specs);
        }
      }
    }
    if (specs.macro_displayAtoms) {
      if (this.atoms.length > 0) {
        gl.sphereBuffer.bindBuffers(gl);
        // colors
        gl.material.setTempColors(gl, specs.atoms_materialAmbientColor_3D, undefined, specs.atoms_materialSpecularColor_3D, specs.atoms_materialShininess_3D);
      }
      for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
        var a = this.atoms[i];
        // closestDistance may be 0, so check if undefined
        if (!a.hetatm && (specs.macro_atomToLigandDistance === -1 || (a.closestDistance !== undefined && specs.macro_atomToLigandDistance >= a.closestDistance))) {
          a.render(gl, this.residueSpecs ? this.residueSpecs : specs);
        }
      }
    }
  }
  if (specs.bonds_display) {
    // Array for Half Bonds. It is needed because Half Bonds use the
    // pill buffer.
    var asPills = [];
    // Array for 0 bond order.
    var asSpheres = [];
    if (this.bonds.length > 0) {
      if (specs.bonds_renderAsLines_3D) {
        gl.lineWidth(specs.bonds_width_2D);
        gl.lineBuffer.bindBuffers(gl);
      } else {
        gl.cylinderBuffer.bindBuffers(gl);
      }
      // colors
      gl.material.setTempColors(gl, specs.bonds_materialAmbientColor_3D, undefined, specs.bonds_materialSpecularColor_3D, specs.bonds_materialShininess_3D);
    }
    for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
      var b = this.bonds[i];
      if (!isMacro || b.a1.hetatm) {
        // Check if render as segmented pill will used.
        if (specs.bonds_showBondOrders_3D) {
          if (b.bondOrder == 0) {
            // 0 bond order
            asSpheres.push(b);
          } else if (b.bondOrder == 0.5) {
            // 0.5 bond order
            asPills.push(b);
          } else {
            if (b.bondOrder == 1.5) {
              // For 1.5 bond order, the "1" part will render
              // as cylinder, and the "0.5" part will render
              // as segmented pills
              asPills.push(b);
            }
            b.render(gl, specs);
          }
        } else {
          // this will render the Stick representation
          b.render(gl, specs);
        }

      }
    }
    // Render the Half Bond
    if (asPills.length > 0) {
      // if bonds_renderAsLines_3D is true, then lineBuffer will
      // binded.
      // so in here we just need to check if we need to change
      // the binding buffer to pillBuffer or not.
      if (!specs.bonds_renderAsLines_3D) {
        gl.pillBuffer.bindBuffers(gl);
      }
      for ( var i = 0, ii = asPills.length; i < ii; i++) {
        asPills[i].render(gl, specs, true);
      }
    }
    // Render zero bond order
    if (asSpheres.length > 0) {
      // if bonds_renderAsLines_3D is true, then lineBuffer will
      // binded.
      // so in here we just need to check if we need to change
      // the binding buffer to pillBuffer or not.
      if (!specs.bonds_renderAsLines_3D) {
        gl.sphereBuffer.bindBuffers(gl);
      }
      for ( var i = 0, ii = asSpheres.length; i < ii; i++) {
        asSpheres[i].render(gl, specs, true);
      }
    }
  }
  if (specs.atoms_display) {
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      var a = this.atoms[i];
      a.bondNumber = 0;
      a.renderAsStar = false;
    }
    for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
      var b = this.bonds[i];
      b.a1.bondNumber++;
      b.a2.bondNumber++;
    }
    if (this.atoms.length > 0) {
      gl.sphereBuffer.bindBuffers(gl);
      // colors
      gl.material.setTempColors(gl, specs.atoms_materialAmbientColor_3D, undefined, specs.atoms_materialSpecularColor_3D, specs.atoms_materialShininess_3D);
    }
    var asStars = [];
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      var a = this.atoms[i];
      if (!isMacro || (a.hetatm && (specs.macro_showWater || !a.isWater))) {
        if (specs.atoms_nonBondedAsStars_3D && a.bondNumber === 0) {
          a.renderAsStar = true;
          asStars.push(a);
        } else {
          a.render(gl, specs);
        }
      }
    }
    if (asStars.length > 0) {
      gl.starBuffer.bindBuffers(gl);
      for ( var i = 0, ii = asStars.length; i < ii; i++) {
        asStars[i].render(gl, specs);
      }
    }
  }
  if (this.chains) {
    // set up the model view matrix, since it won't be modified
    // for macromolecules
    gl.shader.setMatrixUniforms(gl);
    // render chains
    if (specs.proteins_displayRibbon) {
      // proteins
      // colors
      gl.material.setTempColors(gl, specs.proteins_materialAmbientColor_3D, undefined, specs.proteins_materialSpecularColor_3D, specs.proteins_materialShininess_3D);
      var uses = specs.proteins_ribbonCartoonize ? this.cartoons : this.ribbons;
      for ( var j = 0, jj = uses.length; j < jj; j++) {
        var use = uses[j];
        if (specs.proteins_residueColor !== 'none') {
          use.front.bindBuffers(gl);
          var rainbow = (specs.proteins_residueColor === 'rainbow');
          for ( var i = 0, ii = use.front.segments.length; i < ii; i++) {
            if (rainbow) {
              gl.material.setDiffuseColor(gl, math.rainbowAt(i, ii, specs.macro_rainbowColors));
            }
            use.front.segments[i].render(gl, specs);
          }
          use.back.bindBuffers(gl);
          for ( var i = 0, ii = use.back.segments.length; i < ii; i++) {
            if (rainbow) {
              gl.material.setDiffuseColor(gl, math.rainbowAt(i, ii, specs.macro_rainbowColors));
            }
            use.back.segments[i].render(gl, specs);
          }
        } else {
          use.front.render(gl, specs);
          use.back.render(gl, specs);
        }
      }
    }

    if(specs.proteins_displayPipePlank) {
      for ( var j = 0, jj = this.pipePlanks.length; j < jj; j++) {
        this.pipePlanks[j].render(gl, specs);
      }
    }

    if (specs.proteins_displayBackbone) {
      if (!this.alphaCarbonTrace) {
        // cache the alpha carbon trace
        this.alphaCarbonTrace = {
          nodes : [],
          edges : []
        };
        for ( var j = 0, jj = this.chains.length; j < jj; j++) {
          var rs = this.chains[j];
          var isNucleotide = rs.length > 2 && RESIDUE[rs[2].name] && RESIDUE[rs[2].name].aminoColor === '#BEA06E';
          if (!isNucleotide && rs.length > 0) {
            for ( var i = 0, ii = rs.length - 2; i < ii; i++) {
              var n = rs[i].cp1;
              n.chainColor = rs.chainColor;
              this.alphaCarbonTrace.nodes.push(n);
              var b = new Bond(rs[i].cp1, rs[i + 1].cp1);
              b.residueName = rs[i].name;
              b.chainColor = rs.chainColor;
              this.alphaCarbonTrace.edges.push(b);
              if (i === rs.length - 3) {
                n = rs[i + 1].cp1;
                n.chainColor = rs.chainColor;
                this.alphaCarbonTrace.nodes.push(n);
              }
            }
          }
        }
      }
      if (this.alphaCarbonTrace.nodes.length > 0) {
        var traceSpecs = new VisualSpecifications();
        traceSpecs.atoms_display = true;
        traceSpecs.bonds_display = true;
        traceSpecs.atoms_sphereDiameter_3D = specs.proteins_backboneThickness;
        traceSpecs.bonds_cylinderDiameter_3D = specs.proteins_backboneThickness;
        traceSpecs.bonds_splitColor = false;
        traceSpecs.atoms_color = specs.proteins_backboneColor;
        traceSpecs.bonds_color = specs.proteins_backboneColor;
        traceSpecs.atoms_useVDWDiameters_3D = false;
        // colors
        gl.material.setTempColors(gl, specs.proteins_materialAmbientColor_3D, undefined, specs.proteins_materialSpecularColor_3D, specs.proteins_materialShininess_3D);
        gl.material.setDiffuseColor(gl, specs.proteins_backboneColor);
        for ( var i = 0, ii = this.alphaCarbonTrace.nodes.length; i < ii; i++) {
          var n = this.alphaCarbonTrace.nodes[i];
          if (specs.macro_colorByChain) {
            traceSpecs.atoms_color = n.chainColor;
          }
          gl.sphereBuffer.bindBuffers(gl);
          n.render(gl, traceSpecs);
        }
        for ( var i = 0, ii = this.alphaCarbonTrace.edges.length; i < ii; i++) {
          var e = this.alphaCarbonTrace.edges[i];
          var color;
          var r = RESIDUE[e.residueName] ? RESIDUE[e.residueName] : RESIDUE['*'];
          if (specs.macro_colorByChain) {
            color = e.chainColor;
          } else if (specs.proteins_residueColor === 'shapely') {
            color = r.shapelyColor;
          } else if (specs.proteins_residueColor === 'amino') {
            color = r.aminoColor;
          } else if (specs.proteins_residueColor === 'polarity') {
            if (r.polar) {
              color = '#C10000';
            } else {
              color = '#FFFFFF';
            }
          } else if (specs.proteins_residueColor === 'acidity') {
            if(r.acidity === 1){
              color = '#0000FF';
            }else if(r.acidity === -1){
              color = '#FF0000';
            }else if (r.polar) {
              color = '#FFFFFF';
            } else {
              color = '#773300';
            }
          } else if (specs.proteins_residueColor === 'rainbow') {
            color = math.rainbowAt(i, ii, specs.macro_rainbowColors);
          }
          if (color) {
            traceSpecs.bonds_color = color;
          }
          gl.cylinderBuffer.bindBuffers(gl);
          e.render(gl, traceSpecs);
        }
      }
    }
    if (specs.nucleics_display) {
      // nucleic acids
      // colors
      gl.material.setTempColors(gl, specs.nucleics_materialAmbientColor_3D, undefined, specs.nucleics_materialSpecularColor_3D, specs.nucleics_materialShininess_3D);
      for ( var j = 0, jj = this.tubes.length; j < jj; j++) {
        gl.shader.setMatrixUniforms(gl);
        var use = this.tubes[j];
        use.render(gl, specs);
      }
    }
  }
  if (specs.atoms_display) {
    var highlight = false;
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      var a = this.atoms[i];
      if(a.isHover || a.isSelected){
        highlight = true;
        break;
      }
    }
    if(!highlight){
      for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
        var b = this.bonds[i];
        if(b.isHover || b.isSelected){
          highlight = true;
          break;
        }
      }
    }
    if(highlight){
      gl.sphereBuffer.bindBuffers(gl);
      // colors
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.material.setTempColors(gl, specs.atoms_materialAmbientColor_3D, undefined, '#000000', 0);
      gl.enable(gl.BLEND);
      gl.depthMask(false);
      gl.material.setAlpha(gl, .4);
      gl.sphereBuffer.bindBuffers(gl);
      for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
        var a = this.atoms[i];
        if(a.isHover || a.isSelected){
          a.renderHighlight(gl, specs);
        }
      }
      gl.cylinderBuffer.bindBuffers(gl);
      for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
        var b = this.bonds[i];
        if(b.isHover || b.isSelected){
          b.renderHighlight(gl, specs);
        }
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);			
    }
  }
};
_.renderPickFrame = function(gl, specs, objects, includeAtoms, includeBonds) {
  if (this.specs) {
    specs = this.specs;
  }
  var isMacro = this.atoms.length > 0 && this.atoms[0].hetatm !== undefined;
  if (includeBonds && specs.bonds_display) {
    if (this.bonds.length > 0) {
      if (specs.bonds_renderAsLines_3D) {
        gl.lineWidth(specs.bonds_width_2D);
        gl.lineBuffer.bindBuffers(gl);
      } else {
        gl.cylinderBuffer.bindBuffers(gl);
      }
    }
    for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
      var b = this.bonds[i];
      if (!isMacro || b.a1.hetatm) {
        gl.material.setDiffuseColor(gl, math.idx2color(objects.length));
        b.renderPicker(gl, specs);
        objects.push(b);
      }
    }
  }
  if (includeAtoms && specs.atoms_display) {
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      var a = this.atoms[i];
      a.bondNumber = 0;
      a.renderAsStar = false;
    }
    for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
      var b = this.bonds[i];
      b.a1.bondNumber++;
      b.a2.bondNumber++;
    }
    if (this.atoms.length > 0) {
      gl.sphereBuffer.bindBuffers(gl);
    }
    var asStars = [];
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      var a = this.atoms[i];
      if (!isMacro || (a.hetatm && (specs.macro_showWater || !a.isWater))) {
        if (specs.atoms_nonBondedAsStars_3D && a.bondNumber === 0) {
          a.renderAsStar = true;
          asStars.push(a);
        } else {
          gl.material.setDiffuseColor(gl, math.idx2color(objects.length));
          a.render(gl, specs, true);
          objects.push(a);
        }
      }
    }
    if (asStars.length > 0) {
      gl.starBuffer.bindBuffers(gl);
      for ( var i = 0, ii = asStars.length; i < ii; i++) {
        var a = asStars[i];
        gl.material.setDiffuseColor(gl, math.idx2color(objects.length));
        a.render(gl, specs, true);
        objects.push(a);
      }
    }
  }
};
_.getCenter3D = function() {
  if (this.atoms.length === 1) {
    return new Atom('C', this.atoms[0].x, this.atoms[0].y, this.atoms[0].z);
  }
  var minX = Infinity, minY = Infinity, minZ = Infinity;
  var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  if (this.chains) {
    // residues
    for ( var i = 0, ii = this.chains.length; i < ii; i++) {
      var chain = this.chains[i];
      for ( var j = 0, jj = chain.length; j < jj; j++) {
        var residue = chain[j];
        minX = m.min(residue.cp1.x, residue.cp2.x, minX);
        minY = m.min(residue.cp1.y, residue.cp2.y, minY);
        minZ = m.min(residue.cp1.z, residue.cp2.z, minZ);
        maxX = m.max(residue.cp1.x, residue.cp2.x, maxX);
        maxY = m.max(residue.cp1.y, residue.cp2.y, maxY);
        maxZ = m.max(residue.cp1.z, residue.cp2.z, maxZ);
      }
    }
  }
  for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
    minX = m.min(this.atoms[i].x, minX);
    minY = m.min(this.atoms[i].y, minY);
    minZ = m.min(this.atoms[i].z, minZ);
    maxX = m.max(this.atoms[i].x, maxX);
    maxY = m.max(this.atoms[i].y, maxY);
    maxZ = m.max(this.atoms[i].z, maxZ);
  }
  return new Atom('C', (maxX + minX) / 2, (maxY + minY) / 2, (maxZ + minZ) / 2);
};
_.getCenter = function() {
  if (this.atoms.length === 1) {
    return new Point(this.atoms[0].x, this.atoms[0].y);
  }
  var minX = Infinity, minY = Infinity;
  var maxX = -Infinity, maxY = -Infinity;
  for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
    minX = m.min(this.atoms[i].x, minX);
    minY = m.min(this.atoms[i].y, minY);
    maxX = m.max(this.atoms[i].x, maxX);
    maxY = m.max(this.atoms[i].y, maxY);
  }
  return new Point((maxX + minX) / 2, (maxY + minY) / 2);
};
_.getDimension = function() {
  if (this.atoms.length === 1) {
    return new Point(0, 0);
  }
  var minX = Infinity, minY = Infinity;
  var maxX = -Infinity, maxY = -Infinity;
  if (this.chains) {
    for ( var i = 0, ii = this.chains.length; i < ii; i++) {
      var chain = this.chains[i];
      for ( var j = 0, jj = chain.length; j < jj; j++) {
        var residue = chain[j];
        minX = m.min(residue.cp1.x, residue.cp2.x, minX);
        minY = m.min(residue.cp1.y, residue.cp2.y, minY);
        maxX = m.max(residue.cp1.x, residue.cp2.x, maxX);
        maxY = m.max(residue.cp1.y, residue.cp2.y, maxY);
      }
    }
    minX -= 30;
    minY -= 30;
    maxX += 30;
    maxY += 30;
  }
  for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
    minX = m.min(this.atoms[i].x, minX);
    minY = m.min(this.atoms[i].y, minY);
    maxX = m.max(this.atoms[i].x, maxX);
    maxY = m.max(this.atoms[i].y, maxY);
  }
  return new Point(maxX - minX, maxY - minY);
};
_.check = function(force) {
  // using force improves efficiency, so changes will not be checked
  // until a render occurs
  // you can force a check by sending true to this function after
  // calling check with a false
  if (force && this.doChecks) {
    // only check if the number of bonds has changed
    if (this.findRings) {
      if (this.bonds.length - this.atoms.length !== this.fjNumCache) {
        // find rings
        this.rings = new SSSRFinder(this).rings;
        for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
          this.bonds[i].ring = undefined;
        }
        for ( var i = 0, ii = this.rings.length; i < ii; i++) {
          this.rings[i].setupBonds();
        }
      } else {
        // update rings if any
        for ( var i = 0, ii = this.rings.length; i < ii; i++) {
          var r = this.rings[i];
          r.center = r.getCenter();
        }
      }
    }
    // find lones
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      this.atoms[i].isLone = false;
      if (this.atoms[i].label === 'C') {
        var counter = 0;
        for ( var j = 0, jj = this.bonds.length; j < jj; j++) {
          if (this.bonds[j].a1 === this.atoms[i] || this.bonds[j].a2 === this.atoms[i]) {
            counter++;
          }
        }
        if (counter === 0) {
          this.atoms[i].isLone = true;
        }
      }
    }
    // sort
    var sort = false;
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      if (this.atoms[i].z !== 0) {
        sort = true;
      }
    }
    if (sort) {
      this.sortAtomsByZ();
      this.sortBondsByZ();
    }
    // setup metadata
    this.setupMetaData();
    this.atomNumCache = this.atoms.length;
    this.bondNumCache = this.bonds.length;
    // fj number cache doesnt care if there are separate molecules,
    // as the change will signal a need to check for rings; the
    // accuracy doesn't matter
    this.fjNumCache = this.bonds.length - this.atoms.length;
  }
  this.doChecks = !force;
};
_.getAngles = function(a) {
  var angles = [];
  for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
    if (this.bonds[i].contains(a)) {
      angles.push(a.angle(this.bonds[i].getNeighbor(a)));
    }
  }
  angles.sort(function(a, b) {
    return a - b;
  });
  return angles;
};
_.getCoordinationNumber = function(bs) {
  var coordinationNumber = 0;
  for ( var i = 0, ii = bs.length; i < ii; i++) {
    coordinationNumber += bs[i].bondOrder;
  }
  return coordinationNumber;
};
_.getBonds = function(a) {
  var bonds = [];
  for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
    if (this.bonds[i].contains(a)) {
      bonds.push(this.bonds[i]);
    }
  }
  return bonds;
};
_.sortAtomsByZ = function() {
  for ( var i = 1, ii = this.atoms.length; i < ii; i++) {
    var index = i;
    while (index > 0 && this.atoms[index].z < this.atoms[index - 1].z) {
      var hold = this.atoms[index];
      this.atoms[index] = this.atoms[index - 1];
      this.atoms[index - 1] = hold;
      index--;
    }
  }
};
_.sortBondsByZ = function() {
  for ( var i = 1, ii = this.bonds.length; i < ii; i++) {
    var index = i;
    while (index > 0 && (this.bonds[index].a1.z + this.bonds[index].a2.z) < (this.bonds[index - 1].a1.z + this.bonds[index - 1].a2.z)) {
      var hold = this.bonds[index];
      this.bonds[index] = this.bonds[index - 1];
      this.bonds[index - 1] = hold;
      index--;
    }
  }
};
_.setupMetaData = function() {
  var center = this.getCenter();
  for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
    var a = this.atoms[i];
    a.bonds = this.getBonds(a);
    a.angles = this.getAngles(a);
    a.isHidden = a.bonds.length === 2 && m.abs(m.abs(a.angles[1] - a.angles[0]) - m.PI) < m.PI / 30 && a.bonds[0].bondOrder === a.bonds[1].bondOrder;
    var angleData = math.angleBetweenLargest(a.angles);
    a.angleOfLeastInterference = angleData.angle % (m.PI * 2);
    a.largestAngle = angleData.largest;
    a.coordinationNumber = this.getCoordinationNumber(a.bonds);
    a.bondNumber = a.bonds.length;
    a.molCenter = center;
  }
  for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
    var b = this.bonds[i];
    b.molCenter = center;
  }
};
_.scaleToAverageBondLength = function(length) {
  var avBondLength = this.getAverageBondLength();
  if (avBondLength !== 0) {
    var scale = length / avBondLength;
    for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
      this.atoms[i].x *= scale;
      this.atoms[i].y *= scale;
    }
  }
};
_.getAverageBondLength = function() {
  if (this.bonds.length === 0) {
    return 0;
  }
  var tot = 0;
  for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
    tot += this.bonds[i].getLength();
  }
  tot /= this.bonds.length;
  return tot;
};
_.getBounds = function() {
  var bounds = new math.Bounds();
  for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
    bounds.expand(this.atoms[i].getBounds());
  }
  if (this.chains) {
    for ( var i = 0, ii = this.chains.length; i < ii; i++) {
      var chain = this.chains[i];
      for ( var j = 0, jj = chain.length; j < jj; j++) {
        var residue = chain[j];
        bounds.expand(residue.cp1.x, residue.cp1.y);
        bounds.expand(residue.cp2.x, residue.cp2.y);
      }
    }
    bounds.minX -= 30;
    bounds.minY -= 30;
    bounds.maxX += 30;
    bounds.maxY += 30;
  }
  return bounds;
};
_.getBounds3D = function() {
  var bounds = new math.Bounds();
  for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
    bounds.expand(this.atoms[i].getBounds3D());
  }
  if (this.chains) {
    for ( var i = 0, ii = this.chains.length; i < ii; i++) {
      var chain = this.chains[i];
      for ( var j = 0, jj = chain.length; j < jj; j++) {
        var residue = chain[j];
        bounds.expand3D(residue.cp1.x, residue.cp1.y, residue.cp1.z);
        bounds.expand3D(residue.cp2.x, residue.cp2.y, residue.cp2.z);
      }
    }
  }
  return bounds;
};
_.getAtomGroup = function(a) {
  var ring = false;
  for(var i = 0, ii = this.atoms.length; i<ii; i++){
    this.atoms[i].visited = false;
  }
  for(var i = 0, ii = this.bonds.length; i<ii; i++){
    var b = this.bonds[i];
    if(!ring && b.contains(a) && b.ring!==undefined){
      ring = true;
    }
  }
  if(!ring){
    return undefined;
  }
  var set = [a];
  a.visited = true;
  var q = new Queue();
  q.enqueue(a);
  while (!q.isEmpty()) {
    var atom = q.dequeue();
    for(var i = 0, ii = this.bonds.length; i<ii; i++){
      var b = this.bonds[i];
      if(b.contains(atom) && ring===(b.ring!==undefined)){
        var n = b.getNeighbor(atom);
        if(!n.visited){
          n.visited = true;
          set.push(n);
          q.enqueue(n);
        }
      }
    }
  }
  return set;
};
_.getBondGroup = function(b) {
  var ring = b.ring!==undefined;
  var contained = false;
  for(var i = 0, ii = this.bonds.length; i<ii; i++){
    var bi = this.bonds[i];
    if(bi===b){
      contained = true;
    }
    bi.visited = false;
  }
  if(!contained){
    // this bond isn't part of the molecule
    return undefined;
  }
  var set = [b];
  b.visited = true;
  var q = new Queue();
  q.enqueue(b);
  while (!q.isEmpty()) {
    var bond = q.dequeue();
    for(var i = 0, ii = this.bonds.length; i<ii; i++){
      var n = this.bonds[i];
      if(!n.visited && (n.a1===bond.a1||n.a2===bond.a1||n.a1===bond.a2||n.a2===bond.a2) && (n.ring!==undefined)===ring){
        n.visited = true;
        set.push(n);
        q.enqueue(n);
      }
    }
  }
  return set;
};
