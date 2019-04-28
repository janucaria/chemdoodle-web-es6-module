//
// ChemDoodle Web Components 8.0.0
//
// http://web.chemdoodle.com
//
// Copyright 2009-2017 iChemLabs, LLC.  All rights reserved.
//
// The ChemDoodle Web Components library is licensed under version 3
// of the GNU GENERAL PUBLIC LICENSE.
//
// You may redistribute it and/or modify it under the terms of the
// GNU General Public License as published by the Free Software Foundation,
// either version 3 of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// Please contact iChemLabs <http://www.ichemlabs.com/contact-us> for
// alternate licensing options.
//

import * as lib from './ChemDoodle/lib';
import * as extensions from './ChemDoodle/extensions';
import * as structures from './ChemDoodle/structures';
import * as math from './ChemDoodle/math';
import * as informatics from './ChemDoodle/informatics';
import animations from './ChemDoodle/animations';
import featureDetection from './ChemDoodle/featureDetection';
import * as ChemDoodleWeb from './ChemDoodle';

export var ChemDoodle = ChemDoodleWeb;

ChemDoodle.iChemLabs = {};

ChemDoodle.informatics = informatics;

ChemDoodle.io = {};
ChemDoodle.lib = lib;
ChemDoodle.notations = {};
ChemDoodle.structures = structures;
ChemDoodle.structures.d2 = {};
ChemDoodle.structures.d3 = {};

ChemDoodle.animations = animations;

ChemDoodle.extensions = extensions;

ChemDoodle.math = math;

ChemDoodle.featureDetection = featureDetection;

(function(c, math, structures, RESIDUE, m, undefined) {
	'use strict';
	structures.Molecule = function() {
		this.atoms = [];
		this.bonds = [];
		this.rings = [];
	};
	var _ = structures.Molecule.prototype;
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
								var b = new structures.Bond(rs[i].cp1, rs[i + 1].cp1);
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
					var traceSpecs = new structures.VisualSpecifications();
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
			return new structures.Atom('C', this.atoms[0].x, this.atoms[0].y, this.atoms[0].z);
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
		return new structures.Atom('C', (maxX + minX) / 2, (maxY + minY) / 2, (maxZ + minZ) / 2);
	};
	_.getCenter = function() {
		if (this.atoms.length === 1) {
			return new structures.Point(this.atoms[0].x, this.atoms[0].y);
		}
		var minX = Infinity, minY = Infinity;
		var maxX = -Infinity, maxY = -Infinity;
		for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
			minX = m.min(this.atoms[i].x, minX);
			minY = m.min(this.atoms[i].y, minY);
			maxX = m.max(this.atoms[i].x, maxX);
			maxY = m.max(this.atoms[i].y, maxY);
		}
		return new structures.Point((maxX + minX) / 2, (maxY + minY) / 2);
	};
	_.getDimension = function() {
		if (this.atoms.length === 1) {
			return new structures.Point(0, 0);
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
		return new structures.Point(maxX - minX, maxY - minY);
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
					this.rings = new c.informatics.SSSRFinder(this).rings;
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
		var q = new structures.Queue();
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
		var q = new structures.Queue();
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

})(ChemDoodle, ChemDoodle.math, ChemDoodle.structures, ChemDoodle.RESIDUE, Math);

(function(math, d2, m, undefined) {
	'use strict';
	d2._Shape = function() {
	};
	var _ = d2._Shape.prototype;
	_.drawDecorations = function(ctx, specs) {
		if (this.isHover) {
			var ps = this.getPoints();
			for ( var i = 0, ii = ps.length; i < ii; i++) {
				var p = ps[i];
				this.drawAnchor(ctx, specs, p, p === this.hoverPoint);
			}
		}
	};
	_.getBounds = function() {
		var bounds = new math.Bounds();
		var ps = this.getPoints();
		for ( var i = 0, ii = ps.length; i < ii; i++) {
			var p = ps[i];
			bounds.expand(p.x, p.y);
		}
		return bounds;
	};
	_.drawAnchor = function(ctx, specs, p, hovered) {
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.rotate(m.PI / 4);
		ctx.scale(1 / specs.scale, 1 / specs.scale);
		var boxRadius = 4;
		var innerRadius = boxRadius / 2;

		ctx.beginPath();
		ctx.moveTo(-boxRadius, -boxRadius);
		ctx.lineTo(boxRadius, -boxRadius);
		ctx.lineTo(boxRadius, boxRadius);
		ctx.lineTo(-boxRadius, boxRadius);
		ctx.closePath();
		if (hovered) {
			ctx.fillStyle = specs.colorHover;
		} else {
			ctx.fillStyle = 'white';
		}
		ctx.fill();

		ctx.beginPath();
		ctx.moveTo(-boxRadius, -innerRadius);
		ctx.lineTo(-boxRadius, -boxRadius);
		ctx.lineTo(-innerRadius, -boxRadius);
		ctx.moveTo(innerRadius, -boxRadius);
		ctx.lineTo(boxRadius, -boxRadius);
		ctx.lineTo(boxRadius, -innerRadius);
		ctx.moveTo(boxRadius, innerRadius);
		ctx.lineTo(boxRadius, boxRadius);
		ctx.lineTo(innerRadius, boxRadius);
		ctx.moveTo(-innerRadius, boxRadius);
		ctx.lineTo(-boxRadius, boxRadius);
		ctx.lineTo(-boxRadius, innerRadius);
		ctx.moveTo(-boxRadius, -innerRadius);

		ctx.strokeStyle = 'rgba(0,0,0,.2)';
		ctx.lineWidth = 5;
		ctx.stroke();
		ctx.strokeStyle = 'blue';
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.restore();
	};

})(ChemDoodle.math, ChemDoodle.structures.d2, Math);

(function(extensions, math, structures, d2, m, undefined) {
	'use strict';
	
	d2.AtomMapping = function(o1, o2) {
		// these need to be named 'o', not 'a' or the generic erase function won't work for them
		this.o1 = o1;
		this.o2 = o2;
		this.label = '0';
		this.error = false;
	};
	var _ = d2.AtomMapping.prototype = new d2._Shape();
	_.drawDecorations = function(ctx, specs) {
		if (this.isHover || this.isSelected) {
			ctx.strokeStyle = this.isHover ? specs.colorHover : specs.colorSelect;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(this.o1.x, this.o1.y);
			ctx.lineTo(this.o2.x, this.o2.y);
			ctx.setLineDash([2]);
			ctx.stroke();
			ctx.setLineDash([]);
		}
	};
	_.draw = function(ctx, specs) {
		if (this.o1 && this.o2) {
			var sep = 14;
			this.x1 = this.o1.x+sep*m.cos(this.o1.angleOfLeastInterference);
			this.y1 = this.o1.y-sep*m.sin(this.o1.angleOfLeastInterference);
			this.x2 = this.o2.x+sep*m.cos(this.o2.angleOfLeastInterference);
			this.y2 = this.o2.y-sep*m.sin(this.o2.angleOfLeastInterference);
			ctx.font = extensions.getFontString(specs.text_font_size, specs.text_font_families, specs.text_font_bold, specs.text_font_italic);
			var label = this.label;
			var w = ctx.measureText(label).width;
			if (this.isLassoed) {
				ctx.fillStyle = specs.colorHover;
				ctx.fillRect(this.x1-w/2-3, this.y1-specs.text_font_size/2-3, w+6, specs.text_font_size+6);
				ctx.fillRect(this.x2-w/2-3, this.y2-specs.text_font_size/2-3, w+6, specs.text_font_size+6);
			}
			var color = this.error?specs.colorError:specs.shapes_color;
			if (this.isHover || this.isSelected) {
				color = this.isHover ? specs.colorHover : specs.colorSelect;
			}
			ctx.fillStyle = color;
			ctx.fillRect(this.x1-w/2-1, this.y1-specs.text_font_size/2-1, w+2, specs.text_font_size+2);
			ctx.fillRect(this.x2-w/2-1, this.y2-specs.text_font_size/2-1, w+2, specs.text_font_size+2);
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillStyle = specs.backgroundColor;
			ctx.fillText(label, this.x1, this.y1);
			ctx.fillText(label, this.x2, this.y2);
		}
	};
	_.getPoints = function() {
		return [new structures.Point(this.x1, this.y1), new structures.Point(this.x2, this.y2)];
	};
	_.isOver = function(p, barrier) {
		if(this.x1){
			return p.distance({x:this.x1, y:this.y1})<barrier || p.distance({x:this.x2, y:this.y2})<barrier;
		}
		return false;
	};

})(ChemDoodle.extensions, ChemDoodle.math, ChemDoodle.structures, ChemDoodle.structures.d2, Math);

(function(extensions, math, structures, d2, m, undefined) {
	'use strict';
	d2.Bracket = function(p1, p2) {
		this.p1 = p1 ? p1 : new structures.Point();
		this.p2 = p2 ? p2 : new structures.Point();
	};
	var _ = d2.Bracket.prototype = new d2._Shape();
	_.charge = 0;
	_.mult = 0;
	_.repeat = 0;
	_.draw = function(ctx, specs) {
		var minX = m.min(this.p1.x, this.p2.x);
		var maxX = m.max(this.p1.x, this.p2.x);
		var minY = m.min(this.p1.y, this.p2.y);
		var maxY = m.max(this.p1.y, this.p2.y);
		var h = maxY - minY;
		var lip = h / 10;
		ctx.beginPath();
		ctx.moveTo(minX + lip, minY);
		ctx.lineTo(minX, minY);
		ctx.lineTo(minX, maxY);
		ctx.lineTo(minX + lip, maxY);
		ctx.moveTo(maxX - lip, maxY);
		ctx.lineTo(maxX, maxY);
		ctx.lineTo(maxX, minY);
		ctx.lineTo(maxX - lip, minY);
		if (this.isLassoed) {
			var grd = ctx.createLinearGradient(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
			grd.addColorStop(0, 'rgba(212, 99, 0, 0)');
			grd.addColorStop(0.5, 'rgba(212, 99, 0, 0.8)');
			grd.addColorStop(1, 'rgba(212, 99, 0, 0)');
			ctx.lineWidth = specs.shapes_lineWidth + 5;
			ctx.strokeStyle = grd;
			ctx.lineJoin = 'miter';
			ctx.lineCap = 'square';
			ctx.stroke();
		}
		ctx.strokeStyle = specs.shapes_color;
		ctx.lineWidth = specs.shapes_lineWidth;
		ctx.lineJoin = 'miter';
		ctx.lineCap = 'butt';
		ctx.stroke();
		if (this.charge !== 0) {
			ctx.fillStyle = specs.text_color;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'alphabetic';
			ctx.font = extensions.getFontString(specs.text_font_size, specs.text_font_families);
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
			ctx.fillText(s, maxX + 5, minY + 5);
		}
		if (this.mult !== 0) {
			ctx.fillStyle = specs.text_color;
			ctx.textAlign = 'right';
			ctx.textBaseline = 'middle';
			ctx.font = extensions.getFontString(specs.text_font_size, specs.text_font_families);
			ctx.fillText(this.mult.toFixed(0), minX - 5, minY + h / 2);
		}
		if (this.repeat !== 0) {
			ctx.fillStyle = specs.text_color;
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';
			ctx.font = extensions.getFontString(specs.text_font_size, specs.text_font_families);
			var s = this.repeat.toFixed(0);
			ctx.fillText(s, maxX + 5, maxY - 5);
		}
	};
	_.getPoints = function() {
		return [ this.p1, this.p2 ];
	};
	_.isOver = function(p, barrier) {
		return math.isBetween(p.x, this.p1.x, this.p2.x) && math.isBetween(p.y, this.p1.y, this.p2.y);
	};

})(ChemDoodle.extensions, ChemDoodle.math, ChemDoodle.structures, ChemDoodle.structures.d2, Math);

(function(extensions, math, jsb, structures, d2, m, undefined) {
	'use strict';

	d2.DynamicBracket = function(b1, b2) {
		this.b1 = b1;
		this.b2 = b2;
		this.n1 = 1;
		this.n2 = 4;
		this.contents = [];
		this.ps = [];
	};
	var _ = d2.DynamicBracket.prototype = new d2._Shape();
	_.drawDecorations = function(ctx, specs) {
		if (this.isHover) {
			for(var i = 0, ii = this.contents.length; i<ii; i++){
				var a = this.contents[i];
				var grd = ctx.createRadialGradient(a.x - 1, a.y - 1, 0, a.x, a.y, 7);
				grd.addColorStop(0, 'rgba(212, 99, 0, 0)');
				grd.addColorStop(0.7, 'rgba(212, 99, 0, 0.8)');
				ctx.fillStyle = grd;
				ctx.beginPath();
				ctx.arc(a.x, a.y, 5, 0, m.PI * 2, false);
				ctx.fill();
			}
		}
	};
	var drawEnd = function(ctx, specs, b, b2, contents) {
		var ps = [];
		var stretch = 10;
		var arm = 4;
		var a = contents.length>0?(contents.indexOf(b.a1)===-1?b.a2:b.a1):(b.a1.distance(b2.getCenter())<b.a2.distance(b2.getCenter())?b.a1:b.a2);
		var angle = a.angle(b.getNeighbor(a));
		var perp = angle+m.PI/2;
		var length = b.getLength()/(contents.length>1?4:2);
		var psx = a.x+length*m.cos(angle);
		var psy = a.y-length*m.sin(angle);
		var scos = stretch*m.cos(perp);
		var ssin = stretch*m.sin(perp);
		var p1x = psx+scos;
		var p1y = psy-ssin;
		var p2x = psx-scos;
		var p2y = psy+ssin;
		var acos = -arm*m.cos(angle);
		var asin = -arm*m.sin(angle);
		var p1ax = p1x+acos;
		var p1ay = p1y-asin;
		var p2ax = p2x+acos;
		var p2ay = p2y-asin;
		ctx.beginPath();
		ctx.moveTo(p1ax, p1ay);
		ctx.lineTo(p1x, p1y);
		ctx.lineTo(p2x, p2y);
		ctx.lineTo(p2ax, p2ay);
		ctx.stroke();
		ps.push(new structures.Point(p1x, p1y));
		ps.push(new structures.Point(p2x, p2y));
		return ps;
	};
	_.draw = function(ctx, specs) {
		if (this.b1 && this.b2) {
			var color = this.error?specs.colorError:specs.shapes_color;
			if (this.isHover || this.isSelected) {
				color = this.isHover ? specs.colorHover : specs.colorSelect;
			}
			ctx.strokeStyle = color;
			ctx.fillStyle = ctx.strokeStyle;
			ctx.lineWidth = specs.shapes_lineWidth;
			ctx.lineJoin = 'miter';
			ctx.lineCap = 'butt';
			var ps1 = drawEnd(ctx, specs, this.b1, this.b2, this.contents);
			var ps2 = drawEnd(ctx, specs, this.b2, this.b1, this.contents);
			this.ps = ps1.concat(ps2);
			if(this.b1.getCenter().x>this.b2.getCenter().x){
				if(this.ps[0].x>this.ps[1].x+5){
					this.textPos = this.ps[0];
				}else{
					this.textPos = this.ps[1];
				}
			}else{
				if(this.ps[2].x>this.ps[3].x+5){
					this.textPos = this.ps[2];
				}else{
					this.textPos = this.ps[3];
				}
			}
			if(!this.error && this.contents.length>0){
				ctx.font = extensions.getFontString(specs.text_font_size, specs.text_font_families, specs.text_font_bold, specs.text_font_italic);
				ctx.fillStyle = this.isHover?specs.colorHover:specs.text_color;
				ctx.textAlign = 'left';
				ctx.textBaseline = 'bottom';
				ctx.fillText(this.n1+'-'+this.n2, this.textPos.x+2, this.textPos.y+2);
			}
		}
	};
	_.getPoints = function() {
		return this.ps;
	};
	_.isOver = function(p, barrier) {
		return false;
	};
	_.setContents = function(sketcher){
		this.contents = [];
		var m1 = sketcher.getMoleculeByAtom(this.b1.a1);
		var m2 = sketcher.getMoleculeByAtom(this.b2.a1);
		// make sure both b1 and b2 are part of the same molecule
		if(m1 && m1===m2){
			// if either b1 or b2 is in a ring, then stop, as this is a violation
			// unless b1 and b2 are part of the same ring and are part of no other rings
			var c1 = 0;
			var c2 = 0;
			for(var i = 0, ii = m1.rings.length; i<ii; i++){
				var r = m1.rings[i];
				for(var j = 0, jj = r.bonds.length; j<jj; j++){
					var rb = r.bonds[j];
					if(rb===this.b1){
						c1++;
					}else if(rb===this.b2){
						c2++;
					}
				}
			}
			var sameSingleRing = c1===1 && c2===1 && this.b1.ring===this.b2.ring;
			this.contents.flippable = sameSingleRing;
			if(this.b1.ring===undefined && this.b2.ring===undefined || sameSingleRing){
				for(var i = 0, ii = m1.atoms.length; i<ii; i++){
					var reached1 = false; 
					var reached2 = false;
					var reachedInner = false;
					for (var j = 0, jj = m1.bonds.length; j<jj; j++) {
						m1.bonds[j].visited = false;
					}
					var q = new structures.Queue();
					var a = m1.atoms[i];
					q.enqueue(a);
					while (!q.isEmpty() && !(reached1 && reached2)) {
						var check = q.dequeue();
						if(sameSingleRing && (!this.flip && check===this.b1.a1 || this.flip && check===this.b1.a2)){
							reachedInner = true;
						}
						for (var j = 0, jj = m1.bonds.length; j<jj; j++) {
							var b = m1.bonds[j];
							if(b.a1===check || b.a2===check){
								if (b === this.b1) {
									reached1 = true;
								} else if (b === this.b2) {
									reached2 = true;
								} else if (!b.visited) {
									b.visited = true;
									q.enqueue(b.getNeighbor(check));
								}
							}
						}
					}
					if(reached1 && reached2 && (!sameSingleRing || reachedInner)){
						this.contents.push(a);
					}
				}
			}
		}
	};

})(ChemDoodle.extensions, ChemDoodle.math, ChemDoodle.lib.jsBezier, ChemDoodle.structures, ChemDoodle.structures.d2, Math);

(function(extensions, math, structures, d2, m, undefined) {
	'use strict';
	d2.Line = function(p1, p2) {
		this.p1 = p1 ? p1 : new structures.Point();
		this.p2 = p2 ? p2 : new structures.Point();
	};
	d2.Line.ARROW_SYNTHETIC = 'synthetic';
	d2.Line.ARROW_RETROSYNTHETIC = 'retrosynthetic';
	d2.Line.ARROW_RESONANCE = 'resonance';
	d2.Line.ARROW_EQUILIBRIUM = 'equilibrium';
	var _ = d2.Line.prototype = new d2._Shape();
	_.arrowType = undefined;
	_.topText = undefined;
	_.bottomText = undefined;
	_.draw = function(ctx, specs) {
		if (this.isLassoed) {
			var grd = ctx.createLinearGradient(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
			grd.addColorStop(0, 'rgba(212, 99, 0, 0)');
			grd.addColorStop(0.5, 'rgba(212, 99, 0, 0.8)');
			grd.addColorStop(1, 'rgba(212, 99, 0, 0)');
			var useDist = 2.5;
			var perpendicular = this.p1.angle(this.p2) + m.PI / 2;
			var mcosp = m.cos(perpendicular);
			var msinp = m.sin(perpendicular);
			var cx1 = this.p1.x - mcosp * useDist;
			var cy1 = this.p1.y + msinp * useDist;
			var cx2 = this.p1.x + mcosp * useDist;
			var cy2 = this.p1.y - msinp * useDist;
			var cx3 = this.p2.x + mcosp * useDist;
			var cy3 = this.p2.y - msinp * useDist;
			var cx4 = this.p2.x - mcosp * useDist;
			var cy4 = this.p2.y + msinp * useDist;
			ctx.fillStyle = grd;
			ctx.beginPath();
			ctx.moveTo(cx1, cy1);
			ctx.lineTo(cx2, cy2);
			ctx.lineTo(cx3, cy3);
			ctx.lineTo(cx4, cy4);
			ctx.closePath();
			ctx.fill();
		}
		ctx.strokeStyle = specs.shapes_color;
		ctx.fillStyle = specs.shapes_color;
		ctx.lineWidth = specs.shapes_lineWidth;
		ctx.lineJoin = 'miter';
		ctx.lineCap = 'butt';
		if (this.p1.x !== this.p2.x || this.p1.y !== this.p2.y) {
			// only render if the points are different, otherwise this will
			// cause fill overflows
			if (this.arrowType === d2.Line.ARROW_RETROSYNTHETIC) {
				var r2 = m.sqrt(2) * 2;
				var useDist = specs.shapes_arrowLength_2D / r2;
				var angle = this.p1.angle(this.p2);
				var perpendicular = angle + m.PI / 2;
				var retract = specs.shapes_arrowLength_2D / r2;
				var mcosa = m.cos(angle);
				var msina = m.sin(angle);
				var mcosp = m.cos(perpendicular);
				var msinp = m.sin(perpendicular);
				var cx1 = this.p1.x - mcosp * useDist;
				var cy1 = this.p1.y + msinp * useDist;
				var cx2 = this.p1.x + mcosp * useDist;
				var cy2 = this.p1.y - msinp * useDist;
				var cx3 = this.p2.x + mcosp * useDist - mcosa * retract;
				var cy3 = this.p2.y - msinp * useDist + msina * retract;
				var cx4 = this.p2.x - mcosp * useDist - mcosa * retract;
				var cy4 = this.p2.y + msinp * useDist + msina * retract;
				var ax1 = this.p2.x + mcosp * useDist * 2 - mcosa * retract * 2;
				var ay1 = this.p2.y - msinp * useDist * 2 + msina * retract * 2;
				var ax2 = this.p2.x - mcosp * useDist * 2 - mcosa * retract * 2;
				var ay2 = this.p2.y + msinp * useDist * 2 + msina * retract * 2;
				ctx.beginPath();
				ctx.moveTo(cx2, cy2);
				ctx.lineTo(cx3, cy3);
				ctx.moveTo(ax1, ay1);
				ctx.lineTo(this.p2.x, this.p2.y);
				ctx.lineTo(ax2, ay2);
				ctx.moveTo(cx4, cy4);
				ctx.lineTo(cx1, cy1);
				ctx.stroke();
			} else if (this.arrowType === d2.Line.ARROW_EQUILIBRIUM) {
				var r2 = m.sqrt(2) * 2;
				var useDist = specs.shapes_arrowLength_2D / r2 / 2;
				var angle = this.p1.angle(this.p2);
				var perpendicular = angle + m.PI / 2;
				var retract = specs.shapes_arrowLength_2D * 2 / m.sqrt(3);
				var mcosa = m.cos(angle);
				var msina = m.sin(angle);
				var mcosp = m.cos(perpendicular);
				var msinp = m.sin(perpendicular);
				var cx1 = this.p1.x - mcosp * useDist;
				var cy1 = this.p1.y + msinp * useDist;
				var cx2 = this.p1.x + mcosp * useDist;
				var cy2 = this.p1.y - msinp * useDist;
				var cx3 = this.p2.x + mcosp * useDist;
				var cy3 = this.p2.y - msinp * useDist;
				var cx4 = this.p2.x - mcosp * useDist;
				var cy4 = this.p2.y + msinp * useDist;
				ctx.beginPath();
				ctx.moveTo(cx2, cy2);
				ctx.lineTo(cx3, cy3);
				ctx.moveTo(cx4, cy4);
				ctx.lineTo(cx1, cy1);
				ctx.stroke();
				// right arrow
				var rx1 = cx3 - mcosa * retract * .8;
				var ry1 = cy3 + msina * retract * .8;
				var ax1 = cx3 + mcosp * specs.shapes_arrowLength_2D / 3 - mcosa * retract;
				var ay1 = cy3 - msinp * specs.shapes_arrowLength_2D / 3 + msina * retract;
				ctx.beginPath();
				ctx.moveTo(cx3, cy3);
				ctx.lineTo(ax1, ay1);
				ctx.lineTo(rx1, ry1);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
				// left arrow
				rx1 = cx1 + mcosa * retract * .8;
				ry1 = cy1 - msina * retract * .8;
				ax1 = cx1 - mcosp * specs.shapes_arrowLength_2D / 3 + mcosa * retract;
				ay1 = cy1 + msinp * specs.shapes_arrowLength_2D / 3 - msina * retract;
				ctx.beginPath();
				ctx.moveTo(cx1, cy1);
				ctx.lineTo(ax1, ay1);
				ctx.lineTo(rx1, ry1);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
			} else if (this.arrowType === d2.Line.ARROW_SYNTHETIC) {
				var angle = this.p1.angle(this.p2);
				var perpendicular = angle + m.PI / 2;
				var retract = specs.shapes_arrowLength_2D * 2 / m.sqrt(3);
				var mcosa = m.cos(angle);
				var msina = m.sin(angle);
				var mcosp = m.cos(perpendicular);
				var msinp = m.sin(perpendicular);
				ctx.beginPath();
				ctx.moveTo(this.p1.x, this.p1.y);
				ctx.lineTo(this.p2.x - mcosa * retract / 2, this.p2.y + msina * retract / 2);
				ctx.stroke();
				var rx1 = this.p2.x - mcosa * retract * .8;
				var ry1 = this.p2.y + msina * retract * .8;
				var ax1 = this.p2.x + mcosp * specs.shapes_arrowLength_2D / 3 - mcosa * retract;
				var ay1 = this.p2.y - msinp * specs.shapes_arrowLength_2D / 3 + msina * retract;
				var ax2 = this.p2.x - mcosp * specs.shapes_arrowLength_2D / 3 - mcosa * retract;
				var ay2 = this.p2.y + msinp * specs.shapes_arrowLength_2D / 3 + msina * retract;
				ctx.beginPath();
				ctx.moveTo(this.p2.x, this.p2.y);
				ctx.lineTo(ax2, ay2);
				ctx.lineTo(rx1, ry1);
				ctx.lineTo(ax1, ay1);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
			} else if (this.arrowType === d2.Line.ARROW_RESONANCE) {
				var angle = this.p1.angle(this.p2);
				var perpendicular = angle + m.PI / 2;
				var retract = specs.shapes_arrowLength_2D * 2 / m.sqrt(3);
				var mcosa = m.cos(angle);
				var msina = m.sin(angle);
				var mcosp = m.cos(perpendicular);
				var msinp = m.sin(perpendicular);
				ctx.beginPath();
				ctx.moveTo(this.p1.x + mcosa * retract / 2, this.p1.y - msina * retract / 2);
				ctx.lineTo(this.p2.x - mcosa * retract / 2, this.p2.y + msina * retract / 2);
				ctx.stroke();
				// right arrow
				var rx1 = this.p2.x - mcosa * retract * .8;
				var ry1 = this.p2.y + msina * retract * .8;
				var ax1 = this.p2.x + mcosp * specs.shapes_arrowLength_2D / 3 - mcosa * retract;
				var ay1 = this.p2.y - msinp * specs.shapes_arrowLength_2D / 3 + msina * retract;
				var ax2 = this.p2.x - mcosp * specs.shapes_arrowLength_2D / 3 - mcosa * retract;
				var ay2 = this.p2.y + msinp * specs.shapes_arrowLength_2D / 3 + msina * retract;
				ctx.beginPath();
				ctx.moveTo(this.p2.x, this.p2.y);
				ctx.lineTo(ax2, ay2);
				ctx.lineTo(rx1, ry1);
				ctx.lineTo(ax1, ay1);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
				// left arrow
				rx1 = this.p1.x + mcosa * retract * .8;
				ry1 = this.p1.y - msina * retract * .8;
				ax1 = this.p1.x - mcosp * specs.shapes_arrowLength_2D / 3 + mcosa * retract;
				ay1 = this.p1.y + msinp * specs.shapes_arrowLength_2D / 3 - msina * retract;
				ax2 = this.p1.x + mcosp * specs.shapes_arrowLength_2D / 3 + mcosa * retract;
				ay2 = this.p1.y - msinp * specs.shapes_arrowLength_2D / 3 - msina * retract;
				ctx.beginPath();
				ctx.moveTo(this.p1.x, this.p1.y);
				ctx.lineTo(ax2, ay2);
				ctx.lineTo(rx1, ry1);
				ctx.lineTo(ax1, ay1);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
			} else {
				ctx.beginPath();
				ctx.moveTo(this.p1.x, this.p1.y);
				ctx.lineTo(this.p2.x, this.p2.y);
				ctx.stroke();
			}
			if(this.topText || this.bottomText){
				ctx.font = extensions.getFontString(specs.text_font_size, specs.text_font_families, specs.text_font_bold, specs.text_font_italic);
				ctx.fillStyle = specs.text_color;
			}
			if(this.topText){
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.fillText(this.topText, (this.p1.x+this.p2.x)/2, this.p1.y-5);
			}
			if(this.bottomText){
				ctx.textAlign = 'center';
				ctx.textBaseline = 'top';
				ctx.fillText(this.bottomText, (this.p1.x+this.p2.x)/2, this.p1.y+5);
			}
		}
	};
	_.getPoints = function() {
		return [ this.p1, this.p2 ];
	};
	_.isOver = function(p, barrier) {
		var dist = math.distanceFromPointToLineInclusive(p, this.p1, this.p2);
		return dist !== -1 && dist < barrier;
	};

})(ChemDoodle.extensions, ChemDoodle.math, ChemDoodle.structures, ChemDoodle.structures.d2, Math);

(function(math, jsb, structures, d2, m, undefined) {
	'use strict';
	var getPossibleAngles = function(o) {
		var as = [];
		if (o instanceof structures.Atom) {
			if (o.bondNumber === 0) {
				as.push(m.PI);
			} else if (o.angles) {
				if (o.angles.length === 1) {
					as.push(o.angles[0] + m.PI);
				} else {
					for ( var i = 1, ii = o.angles.length; i < ii; i++) {
						as.push(o.angles[i - 1] + (o.angles[i] - o.angles[i - 1]) / 2);
					}
					var firstIncreased = o.angles[0] + m.PI * 2;
					var last = o.angles[o.angles.length - 1];
					as.push(last + (firstIncreased - last) / 2);
				}
				if (o.largestAngle > m.PI) {
					// always use angle of least interfearence if it is greater
					// than 120
					as = [ o.angleOfLeastInterference ];
				}
				if (o.bonds) {
					// point up towards a carbonyl
					for ( var i = 0, ii = o.bonds.length; i < ii; i++) {
						var b = o.bonds[i];
						if (b.bondOrder === 2) {
							var n = b.getNeighbor(o);
							if (n.label === 'O') {
								as = [ n.angle(o) ];
								break;
							}
						}
					}
				}
			}
		} else {
			var angle = o.a1.angle(o.a2);
			as.push(angle + m.PI / 2);
			as.push(angle + 3 * m.PI / 2);
		}
		for ( var i = 0, ii = as.length; i < ii; i++) {
			while (as[i] > m.PI * 2) {
				as[i] -= m.PI * 2;
			}
			while (as[i] < 0) {
				as[i] += m.PI * 2;
			}
		}
		return as;
	};
	var getPullBack = function(o, specs) {
		var pullback = 3;
		if (o instanceof structures.Atom) {
			if (o.isLabelVisible(specs)) {
				pullback = 8;
			}
			if (o.charge !== 0 || o.numRadical !== 0 || o.numLonePair !== 0) {
				pullback = 13;
			}
		} else if (o instanceof structures.Point) {
			// this is the midpoint of a bond forming pusher
			pullback = 0;
		} else {
			if (o.bondOrder > 1) {
				pullback = 5;
			}
		}
		return pullback;
	};
	var drawPusher = function(ctx, specs, o1, o2, p1, c1, c2, p2, numElectron, caches) {
		var angle1 = c1.angle(p1);
		var angle2 = c2.angle(p2);
		var mcosa = m.cos(angle1);
		var msina = m.sin(angle1);
		// pull back from start
		var pullBack = getPullBack(o1, specs);
		p1.x -= mcosa * pullBack;
		p1.y += msina * pullBack;
		// arrow
		var perpendicular = angle2 + m.PI / 2;
		var retract = specs.shapes_arrowLength_2D * 2 / m.sqrt(3);
		var mcosa = m.cos(angle2);
		var msina = m.sin(angle2);
		var mcosp = m.cos(perpendicular);
		var msinp = m.sin(perpendicular);
		p2.x -= mcosa * 5;
		p2.y += msina * 5;
		var nap = new structures.Point(p2.x, p2.y);
		// pull back from end
		pullBack = getPullBack(o2, specs) / 3;
		nap.x -= mcosa * pullBack;
		nap.y += msina * pullBack;
		p2.x -= mcosa * (retract * 0.8 + pullBack);
		p2.y += msina * (retract * 0.8 + pullBack);
		var rx1 = nap.x - mcosa * retract * 0.8;
		var ry1 = nap.y + msina * retract * 0.8;
		var a1 = new structures.Point(nap.x + mcosp * specs.shapes_arrowLength_2D / 3 - mcosa * retract, nap.y - msinp * specs.shapes_arrowLength_2D / 3 + msina * retract);
		var a2 = new structures.Point(nap.x - mcosp * specs.shapes_arrowLength_2D / 3 - mcosa * retract, nap.y + msinp * specs.shapes_arrowLength_2D / 3 + msina * retract);
		var include1 = true, include2 = true;
		if (numElectron === 1) {
			if (a1.distance(c1) > a2.distance(c1)) {
				include2 = false;
			} else {
				include1 = false;
			}
		}
		ctx.beginPath();
		ctx.moveTo(nap.x, nap.y);
		if (include2) {
			ctx.lineTo(a2.x, a2.y);
		}
		ctx.lineTo(rx1, ry1);
		if (include1) {
			ctx.lineTo(a1.x, a1.y);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		// bezier
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
		ctx.stroke();
		caches.push([ p1, c1, c2, p2 ]);
	};

	d2.Pusher = function(o1, o2, numElectron) {
		this.o1 = o1;
		this.o2 = o2;
		this.numElectron = numElectron ? numElectron : 1;
	};
	var _ = d2.Pusher.prototype = new d2._Shape();
	_.drawDecorations = function(ctx, specs) {
		if (this.isHover) {
			var p1 = this.o1 instanceof structures.Atom ? new structures.Point(this.o1.x, this.o1.y) : this.o1.getCenter();
			var p2 = this.o2 instanceof structures.Atom ? new structures.Point(this.o2.x, this.o2.y) : this.o2.getCenter();
			var ps = [ p1, p2 ];
			for ( var i = 0, ii = ps.length; i < ii; i++) {
				var p = ps[i];
				this.drawAnchor(ctx, specs, p, p === this.hoverPoint);
			}
		}
	};
	_.draw = function(ctx, specs) {
		if (this.o1 && this.o2) {
			ctx.strokeStyle = specs.shapes_color;
			ctx.fillStyle = specs.shapes_color;
			ctx.lineWidth = specs.shapes_lineWidth;
			ctx.lineJoin = 'miter';
			ctx.lineCap = 'butt';
			var p1 = this.o1 instanceof structures.Atom ? new structures.Point(this.o1.x, this.o1.y) : this.o1.getCenter();
			var p2 = this.o2 instanceof structures.Atom ? new structures.Point(this.o2.x, this.o2.y) : this.o2.getCenter();
			var controlDist = 35;
			var as1 = getPossibleAngles(this.o1);
			var as2 = getPossibleAngles(this.o2);
			var c1, c2;
			var minDif = Infinity;
			for ( var i = 0, ii = as1.length; i < ii; i++) {
				for ( var j = 0, jj = as2.length; j < jj; j++) {
					var c1c = new structures.Point(p1.x + controlDist * m.cos(as1[i]), p1.y - controlDist * m.sin(as1[i]));
					var c2c = new structures.Point(p2.x + controlDist * m.cos(as2[j]), p2.y - controlDist * m.sin(as2[j]));
					var dif = c1c.distance(c2c);
					if (dif < minDif) {
						minDif = dif;
						c1 = c1c;
						c2 = c2c;
					}
				}
			}
			this.caches = [];
			if (this.numElectron === -1) {
				var dist = p1.distance(p2)/2;
				var angle = p1.angle(p2);
				var perp = angle+m.PI/2;
				var mcosa = m.cos(angle);
				var msina = m.sin(angle);
				var m1 = new structures.Point(p1.x+(dist-1)*mcosa, p1.y-(dist-1)*msina);
				var cm1 = new structures.Point(m1.x+m.cos(perp+m.PI/6)*controlDist, m1.y - m.sin(perp+m.PI/6)*controlDist);
				var m2 = new structures.Point(p1.x+(dist+1)*mcosa, p1.y-(dist+1)*msina);
				var cm2 = new structures.Point(m2.x+m.cos(perp-m.PI/6)*controlDist, m2.y - m.sin(perp-m.PI/6)*controlDist);
				drawPusher(ctx, specs, this.o1, m1, p1, c1, cm1, m1, 1, this.caches);
				drawPusher(ctx, specs, this.o2, m2, p2, c2, cm2, m2, 1, this.caches);
			} else {
				if (math.intersectLines(p1.x, p1.y, c1.x, c1.y, p2.x, p2.y, c2.x, c2.y)) {
					var tmp = c1;
					c1 = c2;
					c2 = tmp;
				}
				// try to clean up problems, like loops
				var angle1 = c1.angle(p1);
				var angle2 = c2.angle(p2);
				var angleDif = (m.max(angle1, angle2) - m.min(angle1, angle2));
				if (m.abs(angleDif - m.PI) < .001 && this.o1.molCenter === this.o2.molCenter) {
					// in the case where the control tangents are parallel
					angle1 += m.PI / 2;
					angle2 -= m.PI / 2;
					c1.x = p1.x + controlDist * m.cos(angle1 + m.PI);
					c1.y = p1.y - controlDist * m.sin(angle1 + m.PI);
					c2.x = p2.x + controlDist * m.cos(angle2 + m.PI);
					c2.y = p2.y - controlDist * m.sin(angle2 + m.PI);
				}
				drawPusher(ctx, specs, this.o1, this.o2, p1, c1, c2, p2, this.numElectron, this.caches);
			}
		}
	};
	_.getPoints = function() {
		return [];
	};
	_.isOver = function(p, barrier) {
		for ( var i = 0, ii = this.caches.length; i < ii; i++) {
			var r = jsb.distanceFromCurve(p, this.caches[i]);
			if (r.distance < barrier) {
				return true;
			}
		}
		return false;
	};

})(ChemDoodle.math, ChemDoodle.lib.jsBezier, ChemDoodle.structures, ChemDoodle.structures.d2, Math);

(function(math, structures, d2, m, undefined) {
	'use strict';
	
	var BOND = new structures.Bond();
	
	d2.VAP = function(x, y) {
		this.asterisk = new structures.Atom('O', x, y);
		this.substituent;
		this.bondType = 1;
		this.attachments = [];
	};
	var _ = d2.VAP.prototype = new d2._Shape();
	_.drawDecorations = function(ctx, specs) {
		if (this.isHover || this.isSelected) {
			ctx.strokeStyle = this.isHover ? specs.colorHover : specs.colorSelect;
			ctx.lineWidth = 1.2;
			var radius = 7;
			if(this.hoverBond){
				var pi2 = 2 * m.PI;
				var angle = (this.asterisk.angleForStupidCanvasArcs(this.hoverBond) + m.PI / 2) % pi2;
				ctx.strokeStyle = this.isHover ? specs.colorHover : specs.colorSelect;
				ctx.beginPath();
				var angleTo = (angle + m.PI) % pi2;
				angleTo = angleTo % (m.PI * 2);
				ctx.arc(this.asterisk.x, this.asterisk.y, radius, angle, angleTo, false);
				ctx.stroke();
				ctx.beginPath();
				angle += m.PI;
				angleTo = (angle + m.PI) % pi2;
				ctx.arc(this.hoverBond.x, this.hoverBond.y, radius, angle, angleTo, false);
				ctx.stroke();
			}else{
				ctx.beginPath();
				ctx.arc(this.asterisk.x, this.asterisk.y, radius, 0, m.PI * 2, false);
				ctx.stroke();
			}
		}
	};
	_.draw = function(ctx, specs) {
		// asterisk
		ctx.strokeStyle = this.error?specs.colorError:specs.shapes_color;
		ctx.lineWidth = 1;
		var length = 4;
		var sqrt3 = m.sqrt(3)/2;
		ctx.beginPath();
		ctx.moveTo(this.asterisk.x, this.asterisk.y-length);
		ctx.lineTo(this.asterisk.x, this.asterisk.y+length);
		ctx.moveTo(this.asterisk.x-sqrt3*length, this.asterisk.y-length/2);
		ctx.lineTo(this.asterisk.x+sqrt3*length, this.asterisk.y+length/2);
		ctx.moveTo(this.asterisk.x-sqrt3*length, this.asterisk.y+length/2);
		ctx.lineTo(this.asterisk.x+sqrt3*length, this.asterisk.y-length/2);
		ctx.stroke();
		this.asterisk.textBounds = [];
		this.asterisk.textBounds.push({
			x : this.asterisk.x - length,
			y : this.asterisk.y - length,
			w : length*2,
			h : length*2
		});
		var bcsave = specs.bonds_color;
		if(this.error){
			specs.bonds_color = specs.colorError;
		}
		BOND.a1 = this.asterisk;
		// substituent bond
		if(this.substituent){
			BOND.a2 = this.substituent;
			BOND.bondOrder = this.bondType;
			BOND.draw(ctx, specs);
		}
		// attachment bonds
		BOND.bondOrder = 0;
		if(!this.error){
			specs.bonds_color = specs.shapes_color;
		}
		for(var i = 0, ii = this.attachments.length; i<ii; i++){
			BOND.a2 = this.attachments[i];
			BOND.draw(ctx, specs);
		}
		specs.bonds_color = bcsave;
	};
	_.getPoints = function() {
		return [this.asterisk];
	};
	_.isOver = function(p, barrier) {
		return false;
	};

})(ChemDoodle.math, ChemDoodle.structures, ChemDoodle.structures.d2, Math);

(function(d3, m, undefined) {
	'use strict';
	d3._Mesh = function() {
	};
	var _ = d3._Mesh.prototype;
	_.storeData = function(positionData, normalData, indexData) {
		this.positionData = positionData;
		this.normalData = normalData;
		this.indexData = indexData;
	};
	_.setupBuffers = function(gl) {
		this.vertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positionData), gl.STATIC_DRAW);
		this.vertexPositionBuffer.itemSize = 3;
		this.vertexPositionBuffer.numItems = this.positionData.length / 3;

		this.vertexNormalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalData), gl.STATIC_DRAW);
		this.vertexNormalBuffer.itemSize = 3;
		this.vertexNormalBuffer.numItems = this.normalData.length / 3;

		if (this.indexData) {
			this.vertexIndexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indexData), gl.STATIC_DRAW);
			this.vertexIndexBuffer.itemSize = 1;
			this.vertexIndexBuffer.numItems = this.indexData.length;
		}

		if (this.partitions) {
			for ( var i = 0, ii = this.partitions.length; i < ii; i++) {
				var p = this.partitions[i];
				var buffers = this.generateBuffers(gl, p.positionData, p.normalData, p.indexData);
				p.vertexPositionBuffer = buffers[0];
				p.vertexNormalBuffer = buffers[1];
				p.vertexIndexBuffer = buffers[2];
			}
		}
	};
	_.generateBuffers = function(gl, positionData, normalData, indexData) {
		var vertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionData), gl.STATIC_DRAW);
		vertexPositionBuffer.itemSize = 3;
		vertexPositionBuffer.numItems = positionData.length / 3;

		var vertexNormalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
		vertexNormalBuffer.itemSize = 3;
		vertexNormalBuffer.numItems = normalData.length / 3;

		var vertexIndexBuffer;
		if (indexData) {
			vertexIndexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
			vertexIndexBuffer.itemSize = 1;
			vertexIndexBuffer.numItems = indexData.length;
		}

		return [ vertexPositionBuffer, vertexNormalBuffer, vertexIndexBuffer ];
	};
	_.bindBuffers = function(gl) {
		if (!this.vertexPositionBuffer) {
			this.setupBuffers(gl);
		}
		// positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
		gl.vertexAttribPointer(gl.shader.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// normals
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
		gl.vertexAttribPointer(gl.shader.vertexNormalAttribute, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		if (this.vertexIndexBuffer) {
			// indexes
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
		}
	};

})(ChemDoodle.structures.d3, Math);

(function(d3, undefined) {
	'use strict';
	d3._Measurement = function() {
	};
	var _ = d3._Measurement.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		gl.shader.setMatrixUniforms(gl);
		// setting the vertex position buffer to undefined resets the buffers, so this shape can be dynamically updated with the molecule
		if(specs.measurement_update_3D){
			this.vertexPositionBuffer = undefined;
			this.text = undefined;
		}
		if(!this.vertexPositionBuffer){
			this.calculateData(specs);
		}
		this.bindBuffers(gl);
		// colors
		gl.material.setDiffuseColor(gl, specs.shapes_color);
		gl.lineWidth(specs.shapes_lineWidth);
		// render
		gl.drawElements(gl.LINES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	};
	_.renderText = function(gl, specs) {
		gl.shader.setMatrixUniforms(gl);
		// render the text
		if(!this.text){
			this.text = this.getText(specs);
		}
		
		var vertexData = {
			position : [],
			texCoord : [],
			translation : []
		};

		gl.textImage.pushVertexData(this.text.value, this.text.pos, 1, vertexData);
		gl.textMesh.storeData(gl, vertexData.position, vertexData.texCoord, vertexData.translation);
		
		gl.textImage.useTexture(gl);
		gl.textMesh.render(gl);
	};

})(ChemDoodle.structures.d3);

(function(ELEMENT, extensions, d3, math, m, m4, v3, undefined) {
	'use strict';
	d3.Angle = function(a1, a2, a3) {
		this.a1 = a1;
		this.a2 = a2;
		this.a3 = a3;
	};
	var _ = d3.Angle.prototype = new d3._Measurement();
	_.calculateData = function(specs) {
		var positionData = [];
		var normalData = [];
		var indexData = [];
		var dist1 = this.a2.distance3D(this.a1);
		var dist2 = this.a2.distance3D(this.a3);
		this.distUse = m.min(dist1, dist2) / 2;
		// data for the angle
		this.vec1 = v3.normalize([ this.a1.x - this.a2.x, this.a1.y - this.a2.y, this.a1.z - this.a2.z ]);
		this.vec2 = v3.normalize([ this.a3.x - this.a2.x, this.a3.y - this.a2.y, this.a3.z - this.a2.z ]);
		this.angle = extensions.vec3AngleFrom(this.vec1, this.vec2);

		var axis = v3.normalize(v3.cross(this.vec1, this.vec2, []));
		var vec3 = v3.normalize(v3.cross(axis, this.vec1, []));

		var bands = specs.measurement_angleBands_3D;
		for ( var i = 0; i <= bands; ++i) {
			var theta = this.angle * i / bands;
			var vecCos = v3.scale(this.vec1, m.cos(theta), []);
			var vecSin = v3.scale(vec3, m.sin(theta), []);
			var norm = v3.scale(v3.normalize(v3.add(vecCos, vecSin, [])), this.distUse);

			positionData.push(this.a2.x + norm[0], this.a2.y + norm[1], this.a2.z + norm[2]);
			normalData.push(0, 0, 0);
			if (i < bands) {
				indexData.push(i, i + 1);
			}
		}

		this.storeData(positionData, normalData, indexData);
	};
	_.getText = function(specs) {
		var vecCenter = v3.scale(v3.normalize(v3.add(this.vec1, this.vec2, [])), this.distUse + 0.3);
		return {
			pos : [ this.a2.x + vecCenter[0], this.a2.y + vecCenter[1], this.a2.z + vecCenter[2] ],
			value : [ math.angleBounds(this.angle, true).toFixed(2), ' \u00b0' ].join('')
		};
	};

})(ChemDoodle.ELEMENT, ChemDoodle.extensions, ChemDoodle.structures.d3, ChemDoodle.math, Math, ChemDoodle.lib.mat4, ChemDoodle.lib.vec3);

(function(d3, m, undefined) {
	'use strict';
	d3.Arrow = function(radius, longitudeBands) {
		var positionData = [];
		var normalData = [];

		for ( var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
			var theta = longNumber * 2 * m.PI / longitudeBands;
			var sinTheta = m.sin(theta);
			var cosTheta = m.cos(theta);

			var x = cosTheta;
			var y = sinTheta;

			normalData.push(
			// base cylinder
			0, 0, -1, 0, 0, -1,
			// cylinder
			x, y, 0, x, y, 0,
			// base cone
			0, 0, -1, 0, 0, -1,
			// cone
			x, y, 1, x, y, 1);

			positionData.push(
			// base cylinder
			0, 0, 0, radius * x, radius * y, 0,
			// cylinder
			radius * x, radius * y, 0, radius * x, radius * y, 2,
			// base cone
			radius * x, radius * y, 2, radius * x * 2, radius * y * 2, 2,
			// cone
			radius * x * 2, radius * y * 2, 2, 0, 0, 3);
		}

		var indexData = [];
		for ( var i = 0; i < longitudeBands; i++) {
			var offset = i * 8;
			for ( var j = 0, jj = 7; j < jj; j++) {
				var first = j + offset;
				var second = first + 1;
				var third = first + jj + 2;
				var forth = third - 1;
				indexData.push(first, third, second, third, first, forth);
			}
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Arrow.prototype = new d3._Mesh();

})(ChemDoodle.structures.d3, Math);

(function(d3, m, undefined) {
	'use strict';
	d3.Box = function(width, height, depth) {
		width /= 2;
		depth /= 2;

		var positionData = [];
		var normalData = [];

		// top
		positionData.push(width, height, -depth);
		positionData.push(width, height, -depth);
		positionData.push(-width, height, -depth);
		positionData.push(width, height, depth);
		positionData.push(-width, height, depth);
		positionData.push(-width, height, depth);
		for(var i = 6; i--; normalData.push(0 , 1, 0));

		// front
		positionData.push(-width, height, depth);
		positionData.push(-width, height, depth);
		positionData.push(-width, 0, depth);
		positionData.push(width, height, depth);
		positionData.push(width, 0, depth);
		positionData.push(width, 0, depth);
		for(var i = 6; i--; normalData.push(0 , 0, 1));

		// right
		positionData.push(width, height, depth);
		positionData.push(width, height, depth);
		positionData.push(width, 0, depth);
		positionData.push(width, height, -depth);
		positionData.push(width, 0, -depth);
		positionData.push(width, 0, -depth);
		for(var i = 6; i--; normalData.push(1 , 0, 0));

		// back
		positionData.push(width, height, -depth);
		positionData.push(width, height, -depth);
		positionData.push(width, 0, -depth);
		positionData.push(-width, height, -depth);
		positionData.push(-width, 0, -depth);
		positionData.push(-width, 0, -depth);
		for(var i = 6; i--; normalData.push(0 , 0, -1));

		// left
		positionData.push(-width, height, -depth);
		positionData.push(-width, height, -depth);
		positionData.push(-width, 0, -depth);
		positionData.push(-width, height, depth);
		positionData.push(-width, 0, depth);
		positionData.push(-width, 0, depth);
		for(var i = 6; i--; normalData.push(-1 , 0, 0));

		// bottom
		positionData.push(-width, 0, depth);
		positionData.push(-width, 0, depth);
		positionData.push(-width, 0, -depth);
		positionData.push(width, 0, depth);
		positionData.push(width, 0, -depth);
		positionData.push(width, 0, -depth);
		for(var i = 6; i--; normalData.push(0 , -1, 0));

		this.storeData(positionData, normalData);
	};
	d3.Box.prototype = new d3._Mesh();

})(ChemDoodle.structures.d3, Math);

(function(math, d3, v3, m4, m, undefined) {
	'use strict';
	d3.Camera = function() {
		this.fieldOfView = 45;
		this.aspect = 1;
		this.near = 0.1;
		this.far = 10000;
		this.zoom = 1;
		this.viewMatrix = m4.identity([]);
		this.projectionMatrix = m4.identity([]);
	};
	var _ = d3.Camera.prototype;
	_.perspectiveProjectionMatrix = function() {
        var top = m.tan(this.fieldOfView / 360 * m.PI) * this.near * this.zoom;
        var right = this.aspect * top;
        return m4.frustum(-right, right, -top, top, this.near, this.far, this.projectionMatrix);
	};
	_.orthogonalProjectionMatrix = function() {
        var top = m.tan(this.fieldOfView / 360 * m.PI) * ((this.far - this.near) / 2 + this.near) * this.zoom;
        var right = this.aspect * top;
        return m4.ortho(-right, right, -top, top, this.near, this.far, this.projectionMatrix);
	};
	_.updateProjectionMatrix = function(isPerspective) {
		return isPerspective ? this.perspectiveProjectionMatrix() : this.orthogonalProjectionMatrix();
	};
	_.focalLength = function() {
		return (this.far - this.near) / 2 + this.near;
	};
    _.zoomIn = function() {
        this.zoom = m.min(this.zoom * 1.25, 200);
    };
    _.zoomOut = function() {
        this.zoom = m.max(this.zoom / 1.25, 1 / 400);
    };

})(ChemDoodle.math, ChemDoodle.structures.d3, ChemDoodle.lib.vec3, ChemDoodle.lib.mat4, window.Math);

(function(d3, m, m4, undefined) {
	'use strict';
	d3.LineArrow = function() {
		var d = 2.8;
		var w = 0.1;

		this.storeData([
				0, 0, -3, w, 0, -d,
				0, 0, -3, -w, 0, -d,

				0, 0, -3, 0, 0, 3,

				0, 0, 3, w, 0, d,
				0, 0, 3, -w, 0, d
			],
			[
				0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0,
				0, 0, 0, 0, 0, 0
			]);
	};
	d3.LineArrow.prototype = new d3._Mesh();
	
	d3.Compass = function(gl, specs) {

		// setup text X Y Z
		this.textImage = new d3.TextImage();
		this.textImage.init(gl);
		this.textImage.updateFont(gl, specs.text_font_size, specs.text_font_families, specs.text_font_bold, specs.text_font_italic, specs.text_font_stroke_3D);

		this.textMesh = new d3.TextMesh();
		this.textMesh.init(gl);

		var screenRatioHeight = specs.compass_size_3D / gl.canvas.clientHeight;

		var height = 3 / screenRatioHeight;
		var tanTheta = m.tan(specs.projectionPerspectiveVerticalFieldOfView_3D / 360 * m.PI);
		var depth = height / tanTheta;
		var near = m.max(depth - height, 0.1);
		var far = depth + height;

		var aspec = gl.canvas.clientWidth / gl.canvas.clientHeight;

		var fnProjection, z;

		if (specs.projectionPerspective_3D) {
			z = near;
			fnProjection = m4.frustum;
		} else {
			z = depth;
			fnProjection = m4.ortho;
		}

		var nearRatio = z / gl.canvas.clientHeight * 2 * tanTheta;
		var top = tanTheta * z;
		var bottom = -top;
		var left = aspec * bottom;
		var right = aspec * top;

		if(specs.compass_type_3D === 0) {
			var deltaX = -(gl.canvas.clientWidth - specs.compass_size_3D) / 2 + this.textImage.charHeight;
			var deltaY = -(gl.canvas.clientHeight - specs.compass_size_3D) / 2 + this.textImage.charHeight;

			var x = deltaX * nearRatio;
			var y = deltaY * nearRatio;

			left -= x;
			right -= x;
			bottom -= y;
			top -= y;
		}

		this.projectionMatrix = fnProjection(left, right, bottom, top, near, far);
		this.translationMatrix = m4.translate(m4.identity([]), [ 0, 0, -depth ]);

		// vertex data for X Y Z text label
		var vertexData = {
			position : [],
			texCoord : [],
			translation : []
		};

		// it need to auto calculated somehow
		var textPos = 3.5;

		this.textImage.pushVertexData('X', [ textPos, 0, 0 ], 0, vertexData);
		this.textImage.pushVertexData('Y', [ 0, textPos, 0 ], 0, vertexData);
		this.textImage.pushVertexData('Z', [ 0, 0, textPos ], 0, vertexData);

		this.textMesh.storeData(gl, vertexData.position, vertexData.texCoord, vertexData.translation);
	};

	var _ = d3.Compass.prototype;
	_.renderArrow = function(gl, type, color, mvMatrix) {
		gl.material.setDiffuseColor(gl, color);
		gl.shader.setModelViewMatrix(gl, mvMatrix);
		if(type === 1) {
			gl.drawArrays(gl.LINES, 0, gl.lineArrowBuffer.vertexPositionBuffer.numItems);
		} else {
			gl.drawElements(gl.TRIANGLES, gl.arrowBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}
	};
	_.render = function(gl, specs) {
		gl.shader.setProjectionMatrix(gl, this.projectionMatrix);
		specs.compass_type_3D === 1 ? gl.lineArrowBuffer.bindBuffers(gl) : gl.arrowBuffer.bindBuffers(gl);

		gl.material.setTempColors(gl, specs.bonds_materialAmbientColor_3D, undefined, specs.bonds_materialSpecularColor_3D, specs.bonds_materialShininess_3D);

		var modelMatrix = m4.multiply(this.translationMatrix, gl.rotationMatrix, []);
		var angle = m.PI / 2;

		// x - axis
		this.renderArrow(gl, specs.compass_type_3D, specs.compass_axisXColor_3D, m4.rotateY(modelMatrix, angle, []));

		// y - axis
		this.renderArrow(gl, specs.compass_type_3D, specs.compass_axisYColor_3D, m4.rotateX(modelMatrix, -angle, []));

		// z - axis
		this.renderArrow(gl, specs.compass_type_3D, specs.compass_axisZColor_3D, modelMatrix);
	};
	_.renderAxis = function(gl) {
		gl.shader.setProjectionMatrix(gl, this.projectionMatrix);
		var mvMatrix = m4.multiply(this.translationMatrix, gl.rotationMatrix, []);
		gl.shader.setModelViewMatrix(gl, mvMatrix);

		this.textImage.useTexture(gl);
		this.textMesh.render(gl);
	};

})(ChemDoodle.structures.d3, Math, ChemDoodle.lib.mat4);

(function(d3, m, undefined) {
	'use strict';
	d3.Cylinder = function(radius, height, bands, closed) {
		var positionData = [];
		var normalData = [];

		if (closed) {
			for (var i = 0; i <= bands; i++) {
				var theta = i % bands * 2 * m.PI / bands;
				var cosTheta = m.cos(theta);
				var sinTheta = m.sin(theta);

				normalData.push(0, -1, 0);
				positionData.push(0, 0, 0);
				normalData.push(0, -1, 0);
				positionData.push(radius * cosTheta, 0, radius * sinTheta);

			}

			for (var i = 0; i <= bands; i++) {
				var theta = i % bands * 2 * m.PI / bands;
				var cosTheta = m.cos(theta);
				var sinTheta = m.sin(theta);

				normalData.push(cosTheta, 0, sinTheta);
				positionData.push(radius * cosTheta, 0, radius * sinTheta);

				normalData.push(cosTheta, 0, sinTheta);
				positionData.push(radius * cosTheta, height, radius * sinTheta);
			}

			for (var i = 0; i <= bands; i++) {
				var theta = i % bands * 2 * m.PI / bands;
				var cosTheta = m.cos(theta);
				var sinTheta = m.sin(theta);

				normalData.push(0, 1, 0);
				positionData.push(radius * cosTheta, height, radius * sinTheta);

				normalData.push(0, 1, 0);
				positionData.push(0, height, 0);
			}
		} else {
			for (var i = 0; i < bands; i++) {
				var theta = i * 2 * m.PI / bands;
				var cosTheta = m.cos(theta);
				var sinTheta = m.sin(theta);
				normalData.push(cosTheta, 0, sinTheta);
				positionData.push(radius * cosTheta, 0, radius * sinTheta);
				normalData.push(cosTheta, 0, sinTheta);
				positionData.push(radius * cosTheta, height, radius * sinTheta);
			}
			normalData.push(1, 0, 0);
			positionData.push(radius, 0, 0);
			normalData.push(1, 0, 0);
			positionData.push(radius, height, 0);
		}

		this.storeData(positionData, normalData);
	};
	d3.Cylinder.prototype = new d3._Mesh();

})(ChemDoodle.structures.d3, Math);

(function(ELEMENT, d3, m, v3, undefined) {
	'use strict';
	d3.Distance = function(a1, a2, node, offset) {
		this.a1 = a1;
		this.a2 = a2;
		this.node = node;
		this.offset = offset ? offset : 0;
	};
	var _ = d3.Distance.prototype = new d3._Measurement();
	_.calculateData = function(specs) {
		var positionData = [ this.a1.x, this.a1.y, this.a1.z, this.a2.x, this.a2.y, this.a2.z ];
		if (this.node) {
			var r1 = specs.atoms_useVDWDiameters_3D ? ELEMENT[this.a1.label].vdWRadius * specs.atoms_vdwMultiplier_3D : specs.atoms_sphereDiameter_3D / 2;
			var r2 = specs.atoms_useVDWDiameters_3D ? ELEMENT[this.a2.label].vdWRadius * specs.atoms_vdwMultiplier_3D : specs.atoms_sphereDiameter_3D / 2;
			this.move = this.offset + m.max(r1, r2);
			this.displacement = [ (this.a1.x + this.a2.x) / 2 - this.node.x, (this.a1.y + this.a2.y) / 2 - this.node.y, (this.a1.z + this.a2.z) / 2 - this.node.z ];
			v3.normalize(this.displacement);
			var change = v3.scale(this.displacement, this.move, []);
			positionData[0] += change[0];
			positionData[1] += change[1];
			positionData[2] += change[2];
			positionData[3] += change[0];
			positionData[4] += change[1];
			positionData[5] += change[2];
		}
		var normalData = [ 0, 0, 0, 0, 0, 0 ];
		var indexData = [ 0, 1 ];
		this.storeData(positionData, normalData, indexData);
	};
	_.getText = function(specs) {
		var dist = this.a1.distance3D(this.a2);
		var center = [ (this.a1.x + this.a2.x) / 2, (this.a1.y + this.a2.y) / 2, (this.a1.z + this.a2.z) / 2 ];
		if (this.node) {
			var change = v3.scale(this.displacement, this.move+.1, []);
			center[0] += change[0];
			center[1] += change[1];
			center[2] += change[2];
		}
		return {
			pos : center,
			value : [ dist.toFixed(2), ' \u212b' ].join('')
		};
	};

})(ChemDoodle.ELEMENT, ChemDoodle.structures.d3, Math, ChemDoodle.lib.vec3);

(function(math, d3, v3, undefined) {
	'use strict';

	d3.Fog = function(color, fogStart, fogEnd, density) {
		this.fogScene(color, fogStart, fogEnd, density);
	};
	var _ = d3.Fog.prototype;
	_.fogScene = function(color, fogStart, fogEnd, density) {
		this.colorRGB = math.getRGB(color, 1);
		this.fogStart = fogStart;
		this.fogEnd = fogEnd;
		this.density = density;
	};
	
})(ChemDoodle.math, ChemDoodle.structures.d3, ChemDoodle.lib.vec3);

(function(ELEMENT, d3, undefined) {

	d3.Label = function(textImage) {
	};
	var _ = d3.Label.prototype;
	_.updateVerticesBuffer = function(gl, molecules, specs) {
		for ( var i = 0, ii = molecules.length; i < ii; i++) {
			var molecule = molecules[i];
			var moleculeLabel = molecule.labelMesh;
			var atoms = molecule.atoms;
			var vertexData = {
				position : [],
				texCoord : [],
				translation : []
			};

			var isMacro = atoms.length > 0 && atoms[0].hetatm != undefined;

			for ( var j = 0, jj = atoms.length; j < jj; j++) {
				var atom = atoms[j];
				
				var atomLabel = atom.label;
				var zDepth = 0.05;

				// Sphere or Ball and Stick
				if (specs.atoms_useVDWDiameters_3D) {
					var add = ELEMENT[atomLabel].vdWRadius * specs.atoms_vdwMultiplier_3D;
					if (add === 0) {
						add = 1;
					}
					zDepth += add;
				}
				// if Stick or Wireframe
				else if (specs.atoms_sphereDiameter_3D) {
					zDepth += specs.atoms_sphereDiameter_3D / 2 * 1.5;
				}

				if (isMacro) {
					if (!atom.hetatm) {
						if (!specs.macro_displayAtoms) {
							continue;
						}
					} else if (atom.isWater) {
						if (!specs.macro_showWaters) {
							continue;
						}
					}
				}
				
				gl.textImage.pushVertexData(atom.altLabel ? atom.altLabel : atom.label, [ atom.x, atom.y, atom.z ], zDepth, vertexData);

			}

			var chains = molecule.chains;

			if (chains && (specs.proteins_displayRibbon || specs.proteins_displayBackbone)) {

				for ( var j = 0, jj = chains.length; j < jj; j++) {
					var chain = chains[j];

					for ( var k = 0, kk = chain.length; k < kk; k++) {
						var residue = chain[k];

						if (residue.name) {
							var atom = residue.cp1;
							gl.textImage.pushVertexData(residue.name, [ atom.x, atom.y, atom.z ], 2, vertexData);
						}
					}
				}

			}

			moleculeLabel.storeData(gl, vertexData.position, vertexData.texCoord, vertexData.translation, vertexData.zDepth);
		}
	};
	_.render = function(gl, specs, molecules) {
		// use projection for shader text.
		gl.shader.setMatrixUniforms(gl);

		gl.textImage.useTexture(gl);
		for ( var i = 0, ii = molecules.length; i < ii; i++) {
			if (molecules[i].labelMesh) {
				molecules[i].labelMesh.render(gl);
			}
		}
	};

})(ChemDoodle.ELEMENT, ChemDoodle.structures.d3);

(function(d3, m, undefined) {
	'use strict';
	d3.Sphere = function(radius, latitudeBands, longitudeBands) {
		var positionData = [];
		var normalData = [];
		for ( var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
			var theta = latNumber * m.PI / latitudeBands;
			var sinTheta = m.sin(theta);
			var cosTheta = m.cos(theta);

			for ( var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
				var phi = longNumber * 2 * m.PI / longitudeBands;
				var sinPhi = m.sin(phi);
				var cosPhi = m.cos(phi);

				var x = cosPhi * sinTheta;
				var y = cosTheta;
				var z = sinPhi * sinTheta;

				normalData.push(x, y, z);
				positionData.push(radius * x, radius * y, radius * z);
			}
		}

		var indexData = [];
		longitudeBands += 1;
		for ( var latNumber = 0; latNumber < latitudeBands; latNumber++) {
			for ( var longNumber = 0; longNumber < longitudeBands; longNumber++) {
				var first = (latNumber * longitudeBands) + (longNumber % longitudeBands);
				var second = first + longitudeBands;
				indexData.push(first, first + 1, second);
				if (longNumber < longitudeBands - 1) {
					indexData.push(second, first + 1, second + 1);
				}
			}
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Sphere.prototype = new d3._Mesh();

})(ChemDoodle.structures.d3, Math);

(function(RESIDUE, d3, m, v3, undefined) {
	'use strict';
	var loadPartition = function(gl, p) {
		// positions
		gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexPositionBuffer);
		gl.vertexAttribPointer(gl.shader.vertexPositionAttribute, p.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// normals
		gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexNormalBuffer);
		gl.vertexAttribPointer(gl.shader.vertexNormalAttribute, p.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// indexes
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.vertexIndexBuffer);
	};

	function SubRibbon(entire, name, indexes, pi) {
		this.entire = entire;
		this.name = name;
		this.indexes = indexes;
		this.pi = pi;
	}
	var _2 = SubRibbon.prototype;
	// NOTE: To use rainbow coloring for chains, it needs coloring each residue with total residue count
	// and current index residue in chain parameters.
	_2.getColor = function(specs) {
		if (specs.macro_colorByChain) {
			return this.entire.chainColor;
		} else if (this.name) {
			return this.getResidueColor(RESIDUE[this.name] ? this.name : '*', specs);
		} else if (this.helix) {
			return this.entire.front ? specs.proteins_ribbonCartoonHelixPrimaryColor : specs.proteins_ribbonCartoonHelixSecondaryColor;
		} else if (this.sheet) {
			return specs.proteins_ribbonCartoonSheetColor;
		} else {
			return this.entire.front ? specs.proteins_primaryColor : specs.proteins_secondaryColor;
		}
	};
	_2.getResidueColor = function(name, specs) {
		var r = RESIDUE[name];
		if (specs.proteins_residueColor === 'shapely') {
			return r.shapelyColor;
		} else if (specs.proteins_residueColor === 'amino') {
			return r.aminoColor;
		} else if (specs.proteins_residueColor === 'polarity') {
			if (r.polar) {
				return '#C10000';
			} else {
				return '#FFFFFF';
			}
		} else if (specs.proteins_residueColor === 'acidity') {
			if(r.acidity === 1){
				return '#0000FF';
			}else if(r.acidity === -1){
				return '#FF0000';
			}else if (r.polar) {
				return '#FFFFFF';
			} else {
				return '#773300';
			}
		}
		return '#FFFFFF';
	};
	_2.render = function(gl, specs, noColor) {
		if (this.entire.partitions && this.pi !== this.entire.partitions.lastRender) {
			loadPartition(gl, this.entire.partitions[this.pi]);
			this.entire.partitions.lastRender = this.pi;
		}
		if (!this.vertexIndexBuffer) {
			this.vertexIndexBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indexes), gl.STATIC_DRAW);
			this.vertexIndexBuffer.itemSize = 1;
			this.vertexIndexBuffer.numItems = this.indexes.length;
		}
		// indexes
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
		// colors
		if (!noColor && specs.proteins_residueColor !== 'rainbow') {
			gl.material.setDiffuseColor(gl, this.getColor(specs));
		}
		// render
		gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	};

	d3.Ribbon = function(chain, offset, cartoon) {
		// ribbon meshes build front to back, not side to side, so keep this in
		// mind
		var lineSegmentNum = chain[0].lineSegments.length;
		var lineSegmentLength = chain[0].lineSegments[0].length;
		this.partitions = [];
		this.partitions.lastRender = 0;
		var currentPartition;
		this.front = offset > 0;
		// calculate vertex and normal points
		for ( var i = 0, ii = chain.length; i < ii; i++) {
			if (!currentPartition || currentPartition.positionData.length > 65000) {
				if (this.partitions.length > 0) {
					i--;
				}
				currentPartition = {
					count : 0,
					positionData : [],
					normalData : []
				};
				this.partitions.push(currentPartition);
			}
			var residue = chain[i];
			currentPartition.count++;
			for ( var j = 0; j < lineSegmentNum; j++) {
				var lineSegment = cartoon ? residue.lineSegmentsCartoon[j] : residue.lineSegments[j];
				var doSide1 = j === 0;
				var doSide2 = false;
				for ( var k = 0; k < lineSegmentLength; k++) {
					var a = lineSegment[k];
					// normals
					var abovei = i;
					var abovek = k + 1;
					if (i === chain.length - 1 && k === lineSegmentLength - 1) {
						abovek--;
					} else if (k === lineSegmentLength - 1) {
						abovei++;
						abovek = 0;
					}
					var above = cartoon ? chain[abovei].lineSegmentsCartoon[j][abovek] : chain[abovei].lineSegments[j][abovek];
					var negate = false;
					var nextj = j + 1;
					if (j === lineSegmentNum - 1) {
						nextj -= 2;
						negate = true;
					}
					var side = cartoon ? residue.lineSegmentsCartoon[nextj][k] : residue.lineSegments[nextj][k];
					var toAbove = [ above.x - a.x, above.y - a.y, above.z - a.z ];
					var toSide = [ side.x - a.x, side.y - a.y, side.z - a.z ];
					var normal = v3.cross(toAbove, toSide, []);
					// positions
					if (k === 0) {
						// tip
						v3.normalize(toAbove);
						v3.scale(toAbove, -1);
						currentPartition.normalData.push(toAbove[0], toAbove[1], toAbove[2]);
						currentPartition.positionData.push(a.x, a.y, a.z);
					}
					if (doSide1 || doSide2) {
						// sides
						v3.normalize(toSide);
						v3.scale(toSide, -1);
						currentPartition.normalData.push(toSide[0], toSide[1], toSide[2]);
						currentPartition.positionData.push(a.x, a.y, a.z);
						if (doSide1 && k === lineSegmentLength - 1) {
							doSide1 = false;
							k = -1;
						}
					} else {
						// center strips
						v3.normalize(normal);
						if (negate && !this.front || !negate && this.front) {
							v3.scale(normal, -1);
						}
						currentPartition.normalData.push(normal[0], normal[1], normal[2]);
						v3.scale(normal, m.abs(offset));
						currentPartition.positionData.push(a.x + normal[0], a.y + normal[1], a.z + normal[2]);
						if (j === lineSegmentNum - 1 && k === lineSegmentLength - 1) {
							doSide2 = true;
							k = -1;
						}
					}
					if (k === -1 || k === lineSegmentLength - 1) {
						// end
						v3.normalize(toAbove);
						currentPartition.normalData.push(toAbove[0], toAbove[1], toAbove[2]);
						currentPartition.positionData.push(a.x, a.y, a.z);
					}
				}
			}
		}
		
		// build mesh connectivity
		// add 2 to lineSegmentNum and lineSegmentLength to account for sides
		// and ends
		lineSegmentNum += 2;
		lineSegmentLength += 2;
		this.segments = [];
		this.partitionSegments = [];
		for ( var n = 0, nn = this.partitions.length; n < nn; n++) {
			var currentPartition = this.partitions[n];
			var partitionSegmentIndexData = [];
			for ( var i = 0, ii = currentPartition.count - 1; i < ii; i++) {
				var chainIndex = i;
				for ( var j = 0; j < n; j++) {
					chainIndex += this.partitions[j].count - 1;
				}
				var c = chain[chainIndex];
				var residueIndexStart = i * lineSegmentNum * lineSegmentLength;
				var individualIndexData = [];
				for ( var j = 0, jj = lineSegmentNum - 1; j < jj; j++) {
					var segmentIndexStart = residueIndexStart + j * lineSegmentLength;
					for ( var k = 0; k < lineSegmentLength-1; k++) {
						var nextRes = 1;
						if (i === ii) {
							nextRes = 0;
						}
						var add = [ segmentIndexStart + k, segmentIndexStart + lineSegmentLength + k, segmentIndexStart + lineSegmentLength + k + nextRes, segmentIndexStart + k, segmentIndexStart + k + nextRes, segmentIndexStart + lineSegmentLength + k + nextRes ];
						if (k !== lineSegmentLength - 1) {
							if (this.front) {
								individualIndexData.push(add[0], add[1], add[2], add[3], add[5], add[4]);
							} else {
								individualIndexData.push(add[0], add[2], add[1], add[3], add[4], add[5]);
							}
						}
						if (k === lineSegmentLength - 2 && !(i === currentPartition.count - 2 && n === this.partitions.length - 1)) {
							// jump the gap, the other mesh points will be
							// covered,
							// so no need to explicitly skip them
							var jump = lineSegmentNum * lineSegmentLength - k;
							add[2] += jump;
							add[4] += jump;
							add[5] += jump;
						}
						if (this.front) {
							partitionSegmentIndexData.push(add[0], add[1], add[2], add[3], add[5], add[4]);
						} else {
							partitionSegmentIndexData.push(add[0], add[2], add[1], add[3], add[4], add[5]);
						}
					}
				}

				if (cartoon && c.split) {
					var sr = new SubRibbon(this, undefined, partitionSegmentIndexData, n);
					sr.helix = c.helix;
					sr.sheet = c.sheet;
					this.partitionSegments.push(sr);
					partitionSegmentIndexData = [];
				}

				this.segments.push(new SubRibbon(this, c.name, individualIndexData, n));
			}

			var sr = new SubRibbon(this, undefined, partitionSegmentIndexData, n);
			sr.helix = c.helix;
			sr.sheet = c.sheet;
			this.partitionSegments.push(sr);
		}
		this.storeData(this.partitions[0].positionData, this.partitions[0].normalData);
		if (this.partitions.length === 1) {
			// clear partitions to reduce overhead
			this.partitions = undefined;
		}
	};
	var _ = d3.Ribbon.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		this.bindBuffers(gl);
		// colors
		var color = specs.macro_colorByChain ? this.chainColor : undefined;
		if (!color) {
			color = this.front ? specs.proteins_primaryColor : specs.proteins_secondaryColor;
		}
		gl.material.setDiffuseColor(gl, color);
			
		for ( var i = 0, ii = this.partitionSegments.length; i < ii; i++) {
			this.partitionSegments[i].render(gl, specs, !specs.proteins_ribbonCartoonize);
		}
	};

})(ChemDoodle.RESIDUE, ChemDoodle.structures.d3, Math, ChemDoodle.lib.vec3);

(function(math, d3, v3, m4, undefined) {
	'use strict';
	d3.Light = function(diffuseColor, specularColor, direction) {
		this.camera = new d3.Camera();
		this.lightScene(diffuseColor, specularColor, direction);
	};
	var _ = d3.Light.prototype;
	_.lightScene = function(diffuseColor, specularColor, direction) {
		this.diffuseRGB = math.getRGB(diffuseColor, 1);
		this.specularRGB = math.getRGB(specularColor, 1);
		this.direction = direction;
		this.updateView();
	};
	_.updateView = function() {
		var lightDir = v3.normalize(this.direction, []);
		var eyePos = v3.scale(lightDir, (this.camera.near - this.camera.far) / 2 - this.camera.near, []);
		var up = v3.equal(lightDir, [0, 1, 0]) ? [0, 0, 1] : [0, 1, 0];
		m4.lookAt(eyePos, [0, 0, 0], up, this.camera.viewMatrix);
		this.camera.orthogonalProjectionMatrix();
	};

})(ChemDoodle.math, ChemDoodle.structures.d3, ChemDoodle.lib.vec3, ChemDoodle.lib.mat4);

(function(d3, undefined) {
	'use strict';
	d3.Line = function() {
		this.storeData([ 0, 0, 0, 0, 1, 0 ], [ 0, 0, 0, 0, 0, 0 ]);
	};
	d3.Line.prototype = new d3._Mesh();

})(ChemDoodle.structures.d3);

(function(math, d3, undefined) {
	'use strict';
	d3.Material = function() {
	};
	var _ = d3.Material.prototype;
	_.setTempColors = function(gl, ambientColor, diffuseColor, specularColor, shininess) {
		if (ambientColor) {
			gl.shader.setMaterialAmbientColor(gl, math.getRGB(ambientColor, 1));
		}
		if (diffuseColor) {
			gl.shader.setMaterialDiffuseColor(gl, math.getRGB(diffuseColor, 1));
		}
		if (specularColor) {
			gl.shader.setMaterialSpecularColor(gl, math.getRGB(specularColor, 1));
		}
		gl.shader.setMaterialShininess(gl, shininess);
		gl.shader.setMaterialAlpha(gl, 1);
	};
	_.setDiffuseColor = function(gl, diffuseColor) {
		gl.shader.setMaterialDiffuseColor(gl, math.getRGB(diffuseColor, 1));
	};
	_.setAlpha = function(gl, alpha) {
		gl.shader.setMaterialAlpha(gl, alpha);
	};

})(ChemDoodle.math, ChemDoodle.structures.d3);

(function(d3, math, document, undefined) {
	'use strict';
	d3.Picker = function() {
	};
	var _ = d3.Picker.prototype;

	_.init = function(gl) {
		// setup for picking system
		this.framebuffer = gl.createFramebuffer();

		// set pick texture
		var texture2D = gl.createTexture();
		var renderbuffer = gl.createRenderbuffer();

		gl.bindTexture(gl.TEXTURE_2D, texture2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);

		// set framebuffer and bind the texture and renderbuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture2D, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};

	_.setDimension = function(gl, width, height) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

		// get binded depth attachment renderbuffer
		var renderbuffer = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
		if (gl.isRenderbuffer(renderbuffer)) {
			// set renderbuffer dimension
			gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		}

		// get binded color attachment texture 2d
		var texture2D = gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME);
		if (gl.isTexture(texture2D)) {
			// set texture dimension
			gl.bindTexture(gl.TEXTURE_2D, texture2D);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};

})(ChemDoodle.structures.d3, ChemDoodle.math, document);

(function(d3, m, undefined) {
	'use strict';

	d3.Pill = function(radius, height, latitudeBands, longitudeBands) {

		var capHeightScale = 1;
		var capDiameter = 2 * radius;

		height -= capDiameter;

		if (height < 0) {
			capHeightScale = 0;
			height += capDiameter;
		} else if (height < capDiameter) {
			capHeightScale = height / capDiameter;
			height = capDiameter;
		}

		// update latitude and logintude band for two caps.
		// latitudeBands *= 2;
		// longitudeBands *= 2;

		var positionData = [];
		var normalData = [];
		for ( var latNumber = 0; latNumber <= latitudeBands; latNumber++) {
			var theta = latNumber * m.PI / latitudeBands;
			var sinTheta = m.sin(theta);
			var cosTheta = m.cos(theta) * capHeightScale;

			for ( var longNumber = 0; longNumber <= longitudeBands; longNumber++) {
				var phi = longNumber * 2 * m.PI / longitudeBands;
				var sinPhi = m.sin(phi);
				var cosPhi = m.cos(phi);

				var x = cosPhi * sinTheta;
				var y = cosTheta;
				var z = sinPhi * sinTheta;

				normalData.push(x, y, z);
				positionData.push(radius * x, radius * y + (latNumber < latitudeBands / 2 ? height : 0), radius * z);
			}
		}

		var indexData = [];
		longitudeBands += 1;
		for ( var latNumber = 0; latNumber < latitudeBands; latNumber++) {
			for ( var longNumber = 0; longNumber < longitudeBands; longNumber++) {
				var first = (latNumber * longitudeBands) + (longNumber % longitudeBands);
				var second = first + longitudeBands;
				indexData.push(first, first + 1, second);
				if (longNumber < longitudeBands - 1) {
					indexData.push(second, first + 1, second + 1);
				}
			}
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Pill.prototype = new d3._Mesh();

})(ChemDoodle.structures.d3, Math);

(function(extensions, RESIDUE, structures, d3, m, m4, v3, math, undefined) {
	'use strict';
	
	function createDummyResidue(x, y, z) {
		var dummyRes = new structures.Residue(-1);
		dummyRes.cp1 = dummyRes.cp2 = new structures.Atom('', x, y, z);
		return dummyRes;
	}
	
	function Pipe(a1, a2) {
		this.a1 = a1;
		this.a2 = a2;
	};
	var _ = Pipe.prototype;
	_.render = function(gl, specs) {
		var p1 = this.a1;
		var p2 = this.a2;
		var height = 1.001 * p1.distance3D(p2);
		var radiusScale = specs.proteins_cylinderHelixDiameter / 2;
		var scaleVector = [ radiusScale, height, radiusScale ];
		var transform = m4.translate(m4.identity(), [ p1.x, p1.y, p1.z ]);
		var y = [ 0, 1, 0 ];
		var ang = 0;
		var axis;
		if (p1.x === p2.x && p1.z === p2.z) {
			axis = [ 0, 0, 1 ];
			if (p2.y < p1.y) {
				ang = m.PI;
			}
		} else {
			var a2b = [ p2.x - p1.x, p2.y - p1.y, p2.z - p1.z ];
			ang = extensions.vec3AngleFrom(y, a2b);
			axis = v3.cross(y, a2b, []);
		}

		if (ang !== 0) {
			m4.rotate(transform, ang, axis);
		}
		m4.scale(transform, scaleVector);
		gl.shader.setMatrixUniforms(gl, transform);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.cylinderClosedBuffer.vertexPositionBuffer.numItems);
	};

	function Plank(a1, a2, vx) {
		this.a1 = a1;
		this.a2 = a2;
		this.vx = vx;
	};
	var _ = Plank.prototype;
	_.render = function(gl, specs) {
		if (this.specs) {
			specs = this.specs;
		}
		// this is the elongation vector for the plank
		var height = 1.001 * this.a1.distance3D(this.a2);

		var diry = [ this.a2.x - this.a1.x, this.a2.y - this.a1.y, this.a2.z - this.a1.z ];
		var dirz = v3.cross(diry, this.vx, []);
		var dirx = v3.cross(dirz, diry, []);

		v3.normalize(dirx);
		v3.normalize(diry);
		v3.normalize(dirz);

		var transform = [
			dirx[0], dirx[1], dirx[2], 0,
			diry[0], diry[1], diry[2], 0,
			dirz[0], dirz[1], dirz[2], 0,
			this.a1.x, this.a1.y, this.a1.z, 1
		];

		var scaleVector = [ specs.proteins_plankSheetWidth, height, specs.proteins_tubeThickness];
		m4.scale(transform, scaleVector);
		gl.shader.setMatrixUniforms(gl, transform);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.boxBuffer.vertexPositionBuffer.numItems);
	};


	d3.PipePlank = function(rs, specs) {
		this.tubes = [];
		this.helixCylinders = [];
		this.sheetPlanks = [];
		this.chainColor = rs.chainColor;

		var chainNoSS = [];
		var noSSResidues = [];
		var helixResidues = [];
		var sheetResidues = [];

		// the first residue just a dummy residue.
		// so at beginning, the secondary structure of second residue must be check
		if(rs.length > 1) {
			var r0 = rs[0];
			var r1 = rs[1];
			if (r1.helix) {
				helixResidues.push(r0);
			} else if(r1.sheet) {
				sheetResidues.push(r0);
			} else {
				noSSResidues.push(r0);
			}
		}

		// iterate residues
		for ( var i = 1, ii = rs.length - 1; i <= ii; i++) {
			var residue = rs[i];
			if(residue.helix) {
				helixResidues.push(residue);

				if(residue.arrow) {
					var startPoint = v3.create();
					var endPoint = v3.create();

					if (helixResidues.length == 2) {
						// PDB like 2PEC have helix which is just have 2 residues in it.
						startPoint = [helixResidues[0].cp1.x, helixResidues[0].cp1.y, helixResidues[0].cp1.z];
						endPoint = [helixResidues[1].cp1.x, helixResidues[1].cp1.y, helixResidues[1].cp1.z];
					} else {
						
						// To get helix axis, we need at least 4 residues.
						// if residues lenght is 3, then one residue need to be added.
						// The added residue is residue before helix.
						if(helixResidues.length == 3) {
							helixResidues.unshift(rs[m.max(i - 3, 0)]);
						}

						var Ps = [];
						var Vs = [];

						for (var h = 1, hh = helixResidues.length - 1; h < hh; h++) {
							var cai = [helixResidues[h].cp1.x, helixResidues[h].cp1.y, helixResidues[h].cp1.z];
							var A = [helixResidues[h-1].cp1.x, helixResidues[h-1].cp1.y, helixResidues[h-1].cp1.z];
							var B = [helixResidues[h+1].cp1.x, helixResidues[h+1].cp1.y, helixResidues[h+1].cp1.z];

							v3.subtract(A, cai);
							v3.subtract(B, cai);

							var Al = v3.scale(A, v3.length(B), []);
							var Bl = v3.scale(B, v3.length(A), []);

							var V = v3.normalize(v3.add(Al, Bl, []));

							Ps.push(cai);
							Vs.push(V);
						}

						var axes = [];
						for (var h = 0, hh = Ps.length - 1; h < hh; h++) {
							var P1 = Ps[h];
							var V1 = Vs[h];
							var P2 = Ps[h+1];
							var V2 = Vs[h+1];

							var H = v3.normalize(v3.cross(V1, V2, []));

							var P2subP1 = v3.subtract(P2, P1, []);
							var d = v3.dot(P2subP1, H);

							var dH = v3.scale(H, d, []);

							var dHl = v3.length(dH);
							var P2subP1l = v3.length(P2subP1);

							var r = -(dHl * dHl - P2subP1l * P2subP1l) / (2 * v3.dot(v3.subtract(P1, P2, []), V2));

							var H1 = v3.add(P1, v3.scale(V1, r, []), []);
							var H2 = v3.add(P2, v3.scale(V2, r, []), []);

							axes.push([H1, H2]);
						}

						var firstPoint = axes[0][0];
						var secondPoint = axes[0][1];
						var secondToFirst = v3.subtract(firstPoint, secondPoint, []);
						v3.add(firstPoint, secondToFirst, startPoint);

						var firstPoint = axes[axes.length-1][1];
						var secondPoint = axes[axes.length-1][0];
						var secondToFirst = v3.subtract(firstPoint, secondPoint, []);
						v3.add(firstPoint, secondToFirst, endPoint);

					}

					var startAtom = new structures.Atom('', startPoint[0], startPoint[1], startPoint[2]);
					var endAtom = new structures.Atom('', endPoint[0], endPoint[1], endPoint[2]);

					this.helixCylinders.push(new Pipe(startAtom, endAtom));

					helixResidues = [];

					// get vector direction from Pipe end to start
					var helixDir = v3.subtract(startPoint, endPoint, []);
					v3.normalize(helixDir);
					v3.scale(helixDir, .5);

					if (noSSResidues.length > 0) {

						var additionCp = v3.add(startPoint, helixDir, []);
						var prevResCp = noSSResidues[noSSResidues.length - 1].cp1;
						var helixDirToPrevRes = v3.subtract([prevResCp.x, prevResCp.y, prevResCp.z], additionCp, []);
						v3.normalize(helixDirToPrevRes);
						v3.scale(helixDirToPrevRes, .5);
						v3.add(additionCp, helixDirToPrevRes);
						var dummyRes = new structures.Residue(-1);
						dummyRes.cp1 = dummyRes.cp2 = new structures.Atom('', additionCp[0], additionCp[1], additionCp[2]);
						noSSResidues.push(dummyRes);

						// force the non secondary structure spline to end on helix start point.
						var dummyRes = createDummyResidue(startPoint[0], startPoint[1], startPoint[2]);
						noSSResidues.push(dummyRes);

						chainNoSS.push(noSSResidues);
					}

					noSSResidues = [];

					// check for next residue
					if (i < ii) {
						// force the non secondary structure spline to start on helix end point.
						var dummyRes = createDummyResidue(endPoint[0], endPoint[1], endPoint[2]);
						noSSResidues.push(dummyRes);

						var rm = rs[i + 1];
						if (rm.sheet) {
							noSSResidues.push(residue);
							noSSResidues.push(residue);
							chainNoSS.push(noSSResidues);
							noSSResidues = [];

							sheetResidues.push(residue);
						} else {
							// force the non secondary structure spline to start on helix end point.
							v3.scale(helixDir, -1);
							var additionCp = v3.add(endPoint, helixDir, []);
							var nextResCp = rm.cp1;
							var helixDirToNextRes = v3.subtract([nextResCp.x, nextResCp.y, nextResCp.z], additionCp, []);
							v3.normalize(helixDirToNextRes);
							v3.scale(helixDirToNextRes, .5);
							v3.add(additionCp, helixDirToNextRes);
							var dummyRes = createDummyResidue(additionCp[0], additionCp[1], additionCp[2]);
							noSSResidues.push(dummyRes);
						}
					}
				}

			} else if(residue.sheet) {

				sheetResidues.push(residue);
				if(residue.arrow) {

					var p1 = [0, 0, 0];
					var p2 = [0, 0, 0];
					for(var h = 0, hh = sheetResidues.length; h < hh; h++) {
						var guidePoints = sheetResidues[h].guidePointsLarge;
						var gp1 = guidePoints[0];
						var gp2 = guidePoints[guidePoints.length - 1];

						v3.add(p1, [gp1.x, gp1.y, gp1.z]);
						v3.add(p2, [gp2.x, gp2.y, gp2.z]);
					}

					v3.scale(p1, 1 / hh);
					v3.scale(p2, 1 / hh);

					var dirx = v3.subtract(p1, p2);

					var firstRs = sheetResidues[0];
					var lastRs = sheetResidues[sheetResidues.length - 1];

					var firstGuidePoints = firstRs.guidePointsSmall[0];
					var lastGuidePoints = lastRs.guidePointsSmall[0];

					this.sheetPlanks.push(new Plank(firstGuidePoints, lastGuidePoints, dirx));

					sheetResidues = [];

					if (i < ii) {
						var rm = rs[i + 1];

						if (rm.sheet) {
							sheetResidues.push(residue);
						} else {
							var dummyRes = createDummyResidue(lastGuidePoints.x, lastGuidePoints.y, lastGuidePoints.z);
							noSSResidues.push(dummyRes);
						}
					}
				}

			} else {
				noSSResidues.push(residue);

				if (i < ii) {
					var rm = rs[i + 1];
					if (rm.sheet) {
						var guidePoints = residue.guidePointsSmall[0];
						var dummyRes = createDummyResidue(guidePoints.x, guidePoints.y, guidePoints.z);

						noSSResidues.push(dummyRes);

						chainNoSS.push(noSSResidues);
						noSSResidues = [];

						sheetResidues.push(residue);
					}
				}
			}
		}

		if(noSSResidues.length > 1) {
			if(noSSResidues.length == 2) {
				noSSResidues.push(noSSResidues[noSSResidues.length - 1]);
			}
			chainNoSS.push(noSSResidues);
		}
		noSSResidues = [];

		var chainSegments = [];
		for ( var n = 0, nn = chainNoSS.length; n < nn; n++) {
			var nhs = chainNoSS[n];
			var lineSegmentsList = [];

			for ( var i = 0, ii = nhs.length - 1; i <= ii; i++) {
				lineSegmentsList.push(nhs[i].cp1);
			}
			chainSegments.push(lineSegmentsList);
		}

		for (var i = 0, ii = chainSegments.length; i < ii; i++) {
			var t = new d3.CatmullTube(chainSegments[i], specs.proteins_tubeThickness, specs.proteins_tubeResolution_3D, specs.proteins_horizontalResolution);
			t.chainColor = rs.chainColor;
			this.tubes.push(t);
		}
	};
	var _ = d3.PipePlank.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		gl.material.setTempColors(gl, specs.proteins_materialAmbientColor_3D, undefined, specs.proteins_materialSpecularColor_3D, specs.proteins_materialShininess_3D);
		
		// colors
		gl.material.setDiffuseColor(gl, specs.macro_colorByChain ? this.chainColor : specs.proteins_tubeColor);
		for ( var j = 0, jj = this.tubes.length; j < jj; j++) {
			gl.shader.setMatrixUniforms(gl);
			this.tubes[j].render(gl, specs);
		}

		if(!specs.macro_colorByChain) {
			gl.material.setDiffuseColor(gl, specs.proteins_ribbonCartoonHelixSecondaryColor);
		}

		gl.cylinderClosedBuffer.bindBuffers(gl);
		for (var j = 0, jj = this.helixCylinders.length; j < jj; j++) {
			this.helixCylinders[j].render(gl, specs);
		}

		if(!specs.macro_colorByChain) {
			gl.material.setDiffuseColor(gl, specs.proteins_ribbonCartoonSheetColor);
		}

		gl.boxBuffer.bindBuffers(gl);
		for (var j = 0, jj = this.sheetPlanks.length; j < jj; j++) {
			this.sheetPlanks[j].render(gl, specs);
		}

	};

})(ChemDoodle.extensions, ChemDoodle.RESIDUE, ChemDoodle.structures, ChemDoodle.structures.d3, Math, ChemDoodle.lib.mat4, ChemDoodle.lib.vec3, ChemDoodle.math);

(function(d3, undefined) {
	'use strict';
	d3.Quad = function() {
		var positionData = [
			-1, 1, 0, 
			-1, -1, 0, 
			1, 1, 0, 
			1, -1, 0
		];
		var normalData = [
			0, 0, 0,
			0, 0, 0,
			0, 0, 0,
			0, 0, 0
		];
		this.storeData(positionData, normalData);
	};
	d3.Quad.prototype = new d3._Mesh();

})(ChemDoodle.structures.d3);

(function(structures, d3, v3, undefined) {
	'use strict';
	d3.Shape = function(points, thickness) {
		// points must be in the xy-plane, all z-coords must be 0, thickness
		// will be in the z-plane
		var numPoints = points.length;
		var positionData = [];
		var normalData = [];

		// calculate vertex and normal points
		var center = new structures.Point();
		for ( var i = 0, ii = numPoints; i < ii; i++) {
			var next = i + 1;
			if (i === ii - 1) {
				next = 0;
			}
			var z = [ 0, 0, 1 ];
			var currentPoint = points[i];
			var nextPoint = points[next];
			var v = [ nextPoint.x - currentPoint.x, nextPoint.y - currentPoint.y, 0 ];
			var normal = v3.cross(z, v);
			// first four are for the side normal
			// second four will do both the bottom and top triangle normals
			for ( var j = 0; j < 2; j++) {
				positionData.push(currentPoint.x, currentPoint.y, thickness / 2);
				positionData.push(currentPoint.x, currentPoint.y, -thickness / 2);
				positionData.push(nextPoint.x, nextPoint.y, thickness / 2);
				positionData.push(nextPoint.x, nextPoint.y, -thickness / 2);
			}
			// side normals
			for ( var j = 0; j < 4; j++) {
				normalData.push(normal[0], normal[1], normal[2]);
			}
			// top and bottom normals
			normalData.push(0, 0, 1);
			normalData.push(0, 0, -1);
			normalData.push(0, 0, 1);
			normalData.push(0, 0, -1);
			center.add(currentPoint);
		}
		// centers
		center.x /= numPoints;
		center.y /= numPoints;
		normalData.push(0, 0, 1);
		positionData.push(center.x, center.y, thickness / 2);
		normalData.push(0, 0, -1);
		positionData.push(center.x, center.y, -thickness / 2);

		// build mesh connectivity
		var indexData = [];
		var centerIndex = numPoints * 8;
		for ( var i = 0, ii = numPoints; i < ii; i++) {
			var start = i * 8;
			// sides
			indexData.push(start);
			indexData.push(start + 3);
			indexData.push(start + 1);
			indexData.push(start);
			indexData.push(start + 2);
			indexData.push(start + 3);
			// top and bottom
			indexData.push(start + 4);
			indexData.push(centerIndex);
			indexData.push(start + 6);
			indexData.push(start + 5);
			indexData.push(start + 7);
			indexData.push(centerIndex + 1);
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Shape.prototype = new d3._Mesh();

})(ChemDoodle.structures, ChemDoodle.structures.d3, ChemDoodle.lib.vec3);

(function(d3, m, v3, undefined) {
	'use strict';
	d3.Star = function() {
		var ps = [ .8944, .4472, 0, .2764, .4472, .8506, .2764, .4472, -.8506, -.7236, .4472, .5257, -.7236, .4472, -.5257, -.3416, .4472, 0, -.1056, .4472, .3249, -.1056, .4472, -.3249, .2764, .4472, .2008, .2764, .4472, -.2008, -.8944, -.4472, 0, -.2764, -.4472, .8506, -.2764, -.4472, -.8506, .7236, -.4472, .5257, .7236, -.4472, -.5257, .3416, -.4472, 0, .1056, -.4472, .3249, .1056, -.4472, -.3249, -.2764, -.4472, .2008, -.2764, -.4472, -.2008, -.5527, .1058, 0, -.1708, .1058, .5527, -.1708,
				.1058, -.5527, .4471, .1058, .3249, .4471, .1058, -.3249, .5527, -.1058, 0, .1708, -.1058, .5527, .1708, -.1058, -.5527, -.4471, -.1058, .3249, -.4471, -.1058, -.3249, 0, 1, 0, 0, -1, 0 ];
		var is = [ 0, 9, 8, 2, 7, 9, 4, 5, 7, 3, 6, 5, 1, 8, 6, 0, 8, 23, 30, 6, 8, 3, 21, 6, 11, 26, 21, 13, 23, 26, 2, 9, 24, 30, 8, 9, 1, 23, 8, 13, 25, 23, 14, 24, 25, 4, 7, 22, 30, 9, 7, 0, 24, 9, 14, 27, 24, 12, 22, 27, 3, 5, 20, 30, 7, 5, 2, 22, 7, 12, 29, 22, 10, 20, 29, 1, 6, 21, 30, 5, 6, 4, 20, 5, 10, 28, 20, 11, 21, 28, 10, 19, 18, 12, 17, 19, 14, 15, 17, 13, 16, 15, 11, 18, 16, 31, 19, 17, 14, 17, 27, 2, 27, 22, 4, 22, 29, 10, 29, 19, 31, 18, 19, 12, 19, 29, 4, 29, 20, 3, 20, 28,
				11, 28, 18, 31, 16, 18, 10, 18, 28, 3, 28, 21, 1, 21, 26, 13, 26, 16, 31, 15, 16, 11, 16, 26, 1, 26, 23, 0, 23, 25, 14, 25, 15, 31, 17, 15, 13, 15, 25, 0, 25, 24, 2, 24, 27, 12, 27, 17 ];

		var positionData = [];
		var normalData = [];
		var indexData = [];
		for ( var i = 0, ii = is.length; i < ii; i += 3) {
			var j1 = is[i] * 3;
			var j2 = is[i + 1] * 3;
			var j3 = is[i + 2] * 3;

			var p1 = [ ps[j1], ps[j1 + 1], ps[j1 + 2] ];
			var p2 = [ ps[j2], ps[j2 + 1], ps[j2 + 2] ];
			var p3 = [ ps[j3], ps[j3 + 1], ps[j3 + 2] ];

			var toAbove = [ p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2] ];
			var toSide = [ p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2] ];
			var normal = v3.cross(toSide, toAbove, []);
			v3.normalize(normal);

			positionData.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);
			normalData.push(normal[0], normal[1], normal[2], normal[0], normal[1], normal[2], normal[0], normal[1], normal[2]);
			indexData.push(i, i + 1, i + 2);
		}

		this.storeData(positionData, normalData, indexData);
	};
	d3.Star.prototype = new d3._Mesh();

})(ChemDoodle.structures.d3, Math, ChemDoodle.lib.vec3);

(function(d3, extensions, document, window, undefined) {
	'use strict';
	var ratio = 1;
	if(window.devicePixelRatio){
		ratio = window.devicePixelRatio;
	}
	
	d3.TextImage = function() {
		this.ctx = document.createElement('canvas').getContext('2d');
		this.data = [];
		this.text = '';
		this.charHeight = 0;
	};

	var _ = d3.TextImage.prototype;

	_.init = function(gl) {
		// init texture
		this.textureImage = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.textureImage);

		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.bindTexture(gl.TEXTURE_2D, null);

		this.updateFont(gl, 12, [ 'Sans-serif' ], false, false, false);
	};

	_.charData = function(character) {
		var index = this.text.indexOf(character);
		return index >= 0 ? this.data[index] : null;
	};

	_.updateFont = function(gl, fontSize, fontFamilies, fontBold, fontItalic, fontStroke) {
		var ctx = this.ctx;
		var canvas = this.ctx.canvas;
		var data = [];
		var text = "";
		fontSize *= ratio;
		var contextFont = extensions.getFontString(fontSize, fontFamilies, fontBold, fontItalic);

		ctx.font = contextFont;

		ctx.save();

		var totalWidth = 0;
		var charHeight = fontSize * 1.5;

		for ( var i = 32, ii = 127; i < ii; i++) {

			// skip control characters
			// if(i <= 31 || i == 127) continue;

			var character = String.fromCharCode(i), width = ctx.measureText(character).width;

			data.push({
				text : character,
				width : width,
				height : charHeight
			});

			totalWidth += width * 2;
		}
		
		// add other characters
		var chars = '\u00b0\u212b\u00AE'.split('');
		for ( var i = 0, ii = chars.length; i < ii; i++) {

			var character = chars[i], width = ctx.measureText(character).width;

			data.push({
				text : character,
				width : width,
				height : charHeight
			});

			totalWidth += width * 2;
		}

		var areaImage = totalWidth * charHeight;
		var sqrtArea = Math.sqrt(areaImage);
		var totalRows = Math.ceil(sqrtArea / charHeight);
		var maxWidth = Math.ceil(totalWidth / (totalRows - 1));

		canvas.width = maxWidth;
		canvas.height = totalRows * charHeight;

		ctx.font = contextFont;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 1.4;

		ctx.fillStyle = "#fff";

		var offsetRow = 0;
		var posX = 0;
		for ( var i = 0, ii = data.length; i < ii; i++) {
			var charData = data[i];
			var charWidth = charData.width * 2;
			var charHeight = charData.height;
			var charText = charData.text;
			var willWidth = posX + charWidth;

			if (willWidth > maxWidth) {
				offsetRow++;
				posX = 0;
			}

			var posY = offsetRow * charHeight;

			if (fontStroke) {
				// stroke must draw before fill
				ctx.strokeText(charText, posX, posY + (charHeight / 2));
			}

			ctx.fillText(charText, posX, posY + (charHeight / 2));

			charData.x = posX;
			charData.y = posY;

			text += charText;
			posX += charWidth;
		}

		this.text = text;
		this.data = data;
		this.charHeight = charHeight;

		// also update the texture
		gl.bindTexture(gl.TEXTURE_2D, this.textureImage);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
		gl.bindTexture(gl.TEXTURE_2D, null);
	};
	_.pushVertexData = function(text, position, zDepth, data) {
		// characters of string text
		var textPiece = text.toString().split("");

		// height of texture image
		var heightImage = this.getHeight();
		var widthImage = this.getWidth();

		var x1 = -this.textWidth(text) / 2 / ratio;
		var y1 = -this.charHeight / 2 / ratio;

		// iterate each character
		for ( var j = 0, jj = textPiece.length; j < jj; j++) {
			var charData = this.charData(textPiece[j]);

			var width = charData.width;
			var left = charData.x / widthImage;
			var right = left + charData.width * 1.8 / widthImage;
			var top = charData.y / heightImage;
			var bottom = top + charData.height / heightImage;

			var x2 = x1 + width * 1.8 / ratio;
			var y2 = this.charHeight / 2 / ratio;

			data.position.push(
			// left top
			position[0], position[1], position[2],
			// right top
			position[0], position[1], position[2],
			// right bottom
			position[0], position[1], position[2],

			// left top
			position[0], position[1], position[2],
			// left bottom
			position[0], position[1], position[2],
			// right bottom
			position[0], position[1], position[2]);

			data.texCoord.push(
			// left top
			left, top,
			// right bottom
			right, bottom,
			// right top
			right, top,

			// left top
			left, top,
			// left bottom
			left, bottom,
			// right bottom
			right, bottom);

			data.translation.push(
			// left top
			x1, y2, zDepth,
			// right bottom
			x2, y1, zDepth,
			// right top
			x2, y2, zDepth,

			// left top
			x1, y2, zDepth,
			// left bottom
			x1, y1, zDepth,
			// right bottom
			x2, y1, zDepth);

			x1 = x2 + (width - width * 1.8) / ratio;
		}

	};
	_.getCanvas = function() {
		return this.ctx.canvas;
	};
	_.getHeight = function() {
		return this.getCanvas().height;
	};
	_.getWidth = function() {
		return this.getCanvas().width;
	};
	_.textWidth = function(text) {
		return this.ctx.measureText(text).width;
	};
	_.test = function() {
		document.body.appendChild(this.getCanvas());
	};
	_.useTexture = function(gl) {
		gl.bindTexture(gl.TEXTURE_2D, this.textureImage);
	};

})(ChemDoodle.structures.d3, ChemDoodle.extensions, document, window);

(function(d3, m, undefined) {
	'use strict';
	d3.TextMesh = function() {
	};
	var _ = d3.TextMesh.prototype;
	_.init = function(gl) {
		// set vertex buffer
		this.vertexPositionBuffer = gl.createBuffer();
		this.vertexTexCoordBuffer = gl.createBuffer();
		this.vertexTranslationBuffer = gl.createBuffer();
	};
	_.setVertexData = function(gl, vertexBuffer, bufferData, itemSize) {
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData), gl.STATIC_DRAW);
		vertexBuffer.itemSize = itemSize;
		vertexBuffer.numItems = bufferData.length / itemSize;
	};
	_.storeData = function(gl, vertexPositionData, vertexTexCoordData, vertexTranslationData) {
		this.setVertexData(gl, this.vertexPositionBuffer, vertexPositionData, 3);
		this.setVertexData(gl, this.vertexTexCoordBuffer, vertexTexCoordData, 2);
		this.setVertexData(gl, this.vertexTranslationBuffer, vertexTranslationData, 3);
	};
	_.bindBuffers = function(gl) {
		// positions
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
		gl.vertexAttribPointer(gl.shader.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

		// texCoord
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTexCoordBuffer);
		gl.vertexAttribPointer(gl.shader.vertexTexCoordAttribute, this.vertexTexCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

		// translation and z depth
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTranslationBuffer);
		gl.vertexAttribPointer(gl.shader.vertexNormalAttribute, this.vertexTranslationBuffer.itemSize, gl.FLOAT, false, 0, 0);
	};
	_.render = function(gl) {
		var numItems = this.vertexPositionBuffer.numItems;

		if (!numItems) {
			// nothing to do here
			return;
		}

		this.bindBuffers(gl);
		gl.drawArrays(gl.TRIANGLES, 0, numItems);
	};

})(ChemDoodle.structures.d3, Math);

(function(ELEMENT, math, d3, m, m4, v3, undefined) {
	'use strict';
	d3.Torsion = function(a1, a2, a3, a4) {
		this.a1 = a1;
		this.a2 = a2;
		this.a3 = a3;
		this.a4 = a4;
	};
	var _ = d3.Torsion.prototype = new d3._Measurement();
	_.calculateData = function(specs) {
		var positionData = [];
		var normalData = [];
		var indexData = [];
		var dist1 = this.a2.distance3D(this.a1);
		var dist2 = this.a2.distance3D(this.a3);
		this.distUse = m.min(dist1, dist2) / 2;
		// data for the angle
		var b1 = [ this.a2.x - this.a1.x, this.a2.y - this.a1.y, this.a2.z - this.a1.z ];
		var b2 = [ this.a3.x - this.a2.x, this.a3.y - this.a2.y, this.a3.z - this.a2.z ];
		var b3 = [ this.a4.x - this.a3.x, this.a4.y - this.a3.y, this.a4.z - this.a3.z ];
		var cross12 = v3.cross(b1, b2, []);
		var cross23 = v3.cross(b2, b3, []);
		v3.scale(b1, v3.length(b2));
		this.torsion = m.atan2(v3.dot(b1, cross23), v3.dot(cross12, cross23));

		var vec1 = v3.normalize(v3.cross(cross12, b2, []));
		var vec3 = v3.normalize(v3.cross(b2, vec1, []));

		this.pos = v3.add([ this.a2.x, this.a2.y, this.a2.z ], v3.scale(v3.normalize(b2, []), this.distUse));

		var vec0 = [];

		var bands = specs.measurement_angleBands_3D;
		for ( var i = 0; i <= bands; ++i) {
			var theta = this.torsion * i / bands;
			var vecCos = v3.scale(vec1, m.cos(theta), []);
			var vecSin = v3.scale(vec3, m.sin(theta), []);
			var norm = v3.scale(v3.normalize(v3.add(vecCos, vecSin, [])), this.distUse);

			if (i == 0) {
				vec0 = norm;
			}

			positionData.push(this.pos[0] + norm[0], this.pos[1] + norm[1], this.pos[2] + norm[2]);
			normalData.push(0, 0, 0);
			if (i < bands) {
				indexData.push(i, i + 1);
			}
		}

		this.vecText = v3.normalize(v3.add(vec0, norm, []));
		
		var arrowLength = 0.25;
		var b2Norm = v3.normalize(b2, []);
		v3.scale(b2Norm, arrowLength / 4);

		var theta = this.torsion - m.asin(arrowLength / 2) * 2 * this.torsion / m.abs(this.torsion);
		var vecCos = v3.scale(vec1, m.cos(theta), []);
		var vecSin = v3.scale(vec3, m.sin(theta), []);
		var norm = v3.scale(v3.normalize(v3.add(vecCos, vecSin, [])), this.distUse);

		positionData.push(this.pos[0] + b2Norm[0] + norm[0], this.pos[1] + b2Norm[1] + norm[1], this.pos[2] + b2Norm[2] + norm[2]);
		normalData.push(0, 0, 0);

		positionData.push(this.pos[0] - b2Norm[0] + norm[0], this.pos[1] - b2Norm[1] + norm[1], this.pos[2] - b2Norm[2] + norm[2]);
		normalData.push(0, 0, 0);

		indexData.push(--i, i + 1, i, i + 2);

		this.storeData(positionData, normalData, indexData);
	};
	_.getText = function(specs) {
		v3.add(this.pos, v3.scale(this.vecText, this.distUse + 0.3, []));

		return {
			pos : this.pos,
			value : [ math.angleBounds(this.torsion, true, true).toFixed(2), ' \u00b0' ].join('')
		};
	};

})(ChemDoodle.ELEMENT, ChemDoodle.math, ChemDoodle.structures.d3, Math, ChemDoodle.lib.mat4, ChemDoodle.lib.vec3);

(function(extensions, RESIDUE, structures, d3, m, m4, v3, math, undefined) {
	'use strict';
	var loadPartition = function(gl, p) {
		// positions
		gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexPositionBuffer);
		gl.vertexAttribPointer(gl.shader.vertexPositionAttribute, p.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// normals
		gl.bindBuffer(gl.ARRAY_BUFFER, p.vertexNormalBuffer);
		gl.vertexAttribPointer(gl.shader.vertexNormalAttribute, p.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		// indexes
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, p.vertexIndexBuffer);
	};

	var PointRotator = function(point, axis, angle) {
		var d = m.sqrt(axis[1] * axis[1] + axis[2] * axis[2]);
		var Rx = [ 1, 0, 0, 0, 0, axis[2] / d, -axis[1] / d, 0, 0, axis[1] / d, axis[2] / d, 0, 0, 0, 0, 1 ];
		var RxT = [ 1, 0, 0, 0, 0, axis[2] / d, axis[1] / d, 0, 0, -axis[1] / d, axis[2] / d, 0, 0, 0, 0, 1 ];
		var Ry = [ d, 0, -axis[0], 0, 0, 1, 0, 0, axis[0], 0, d, 0, 0, 0, 0, 1 ];
		var RyT = [ d, 0, axis[0], 0, 0, 1, 0, 0, -axis[0], 0, d, 0, 0, 0, 0, 1 ];
		var Rz = [ m.cos(angle), -m.sin(angle), 0, 0, m.sin(angle), m.cos(angle), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];
		var matrix = m4.multiply(Rx, m4.multiply(Ry, m4.multiply(Rz, m4.multiply(RyT, RxT, []))));
		this.rotate = function() {
			return m4.multiplyVec3(matrix, point);
		};
	};

	d3.Tube = function(chain, thickness, cylinderResolution) {
		var lineSegmentNum = chain[0].lineSegments[0].length;
		this.partitions = [];
		var currentPartition;
		this.ends = [];
		this.ends.push(chain[0].lineSegments[0][0]);
		this.ends.push(chain[chain.length - 1].lineSegments[0][0]);
		// calculate vertex and normal points
		var last = [ 1, 0, 0 ];
		for ( var i = 0, ii = chain.length; i < ii; i++) {
			if (!currentPartition || currentPartition.positionData.length > 65000) {
				if (this.partitions.length > 0) {
					i--;
				}
				currentPartition = {
					count : 0,
					positionData : [],
					normalData : [],
					indexData : []
				};
				this.partitions.push(currentPartition);
			}
			var residue = chain[i];
			currentPartition.count++;
			var min = Infinity;
			var p = new structures.Atom('', chain[i].cp1.x, chain[i].cp1.y, chain[i].cp1.z);
			for ( var j = 0; j < lineSegmentNum; j++) {
				var currentPoint = residue.lineSegments[0][j];
				var nextPoint;
				if (j === lineSegmentNum - 1) {
					if (i === chain.length - 1) {
						nextPoint = residue.lineSegments[0][j - 1];
					} else {
						nextPoint = chain[i + 1].lineSegments[0][0];
					}
				} else {
					nextPoint = residue.lineSegments[0][j + 1];
				}
				var axis = [ nextPoint.x - currentPoint.x, nextPoint.y - currentPoint.y, nextPoint.z - currentPoint.z ];
				v3.normalize(axis);
				if (i === chain.length - 1 && j === lineSegmentNum - 1) {
					v3.scale(axis, -1);
				}
				var startVector = v3.cross(axis, last, []);
				v3.normalize(startVector);
				v3.scale(startVector, thickness / 2);
				var rotator = new PointRotator(startVector, axis, 2 * Math.PI / cylinderResolution);
				for ( var k = 0, kk = cylinderResolution; k < kk; k++) {
					var use = rotator.rotate();
					if (k === m.floor(cylinderResolution / 4)) {
						last = [ use[0], use[1], use[2] ];
					}
					currentPartition.normalData.push(use[0], use[1], use[2]);
					currentPartition.positionData.push(currentPoint.x + use[0], currentPoint.y + use[1], currentPoint.z + use[2]);
				}
				// find closest point to attach stick to
				if (p) {
					var dist = currentPoint.distance3D(p);
					if (dist < min) {
						min = dist;
						chain[i].pPoint = currentPoint;
					}
				}
			}
		}

		// build mesh connectivity
		for ( var n = 0, nn = this.partitions.length; n < nn; n++) {
			var currentPartition = this.partitions[n];
			for ( var i = 0, ii = currentPartition.count - 1; i < ii; i++) {
				var indexStart = i * lineSegmentNum * cylinderResolution;
				for ( var j = 0, jj = lineSegmentNum; j < jj; j++) {
					var segmentIndexStart = indexStart + j * cylinderResolution;
					for ( var k = 0; k < cylinderResolution; k++) {
						var next = 1;
						var sk = segmentIndexStart + k;
						currentPartition.indexData.push(sk);
						currentPartition.indexData.push(sk + cylinderResolution);
						currentPartition.indexData.push(sk + cylinderResolution + next);
						currentPartition.indexData.push(sk);
						currentPartition.indexData.push(sk + cylinderResolution + next);
						currentPartition.indexData.push(sk + next);
					}
				}
			}
		}

		this.storeData(this.partitions[0].positionData, this.partitions[0].normalData, this.partitions[0].indexData);

		var ps = [ new structures.Point(2, 0) ];
		for ( var i = 0; i < 60; i++) {
			var ang = i / 60 * m.PI;
			ps.push(new structures.Point(2 * m.cos(ang), -2 * m.sin(ang)));
		}
		ps.push(new structures.Point(-2, 0), new structures.Point(-2, 4), new structures.Point(2, 4));
		var platform = new structures.d3.Shape(ps, 1);

		this.render = function(gl, specs) {
			// draw tube
			this.bindBuffers(gl);
			// colors
			gl.material.setDiffuseColor(gl, specs.macro_colorByChain ? this.chainColor : specs.nucleics_tubeColor);
			// render
			gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
			if (this.partitions) {
				for ( var i = 1, ii = this.partitions.length; i < ii; i++) {
					var p = this.partitions[i];
					loadPartition(gl, p);
					// render
					gl.drawElements(gl.TRIANGLES, p.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
				}
			}

			// draw ends
			gl.sphereBuffer.bindBuffers(gl);
			for ( var i = 0; i < 2; i++) {
				var p = this.ends[i];
				var transform = m4.translate(m4.identity(), [ p.x, p.y, p.z ]);
				var radius = thickness / 2;
				m4.scale(transform, [ radius, radius, radius ]);
				// render
				gl.shader.setMatrixUniforms(gl, transform);
				gl.drawElements(gl.TRIANGLES, gl.sphereBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
			}

			// draw nucleotide handles
			gl.cylinderBuffer.bindBuffers(gl);
			for ( var i = 0, ii = chain.length - 1; i < ii; i++) {
				var residue = chain[i];
				var p1 = residue.pPoint;
				var p2 = new structures.Atom('', residue.cp2.x, residue.cp2.y, residue.cp2.z);
				var height = 1.001 * p1.distance3D(p2);
				var scaleVector = [ thickness / 4, height, thickness / 4 ];
				var transform = m4.translate(m4.identity(), [ p1.x, p1.y, p1.z ]);
				var y = [ 0, 1, 0 ];
				var ang = 0;
				var axis;
				var a2b = [ p2.x - p1.x, p2.y - p1.y, p2.z - p1.z ];
				if (p1.x === p2.x && p1.z === p2.z) {
					axis = [ 0, 0, 1 ];
					if (p1.y < p1.y) {
						ang = m.PI;
					}
				} else {
					ang = extensions.vec3AngleFrom(y, a2b);
					axis = v3.cross(y, a2b, []);
				}
				if (ang !== 0) {
					m4.rotate(transform, ang, axis);
				}
				m4.scale(transform, scaleVector);
				gl.shader.setMatrixUniforms(gl, transform);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, gl.cylinderBuffer.vertexPositionBuffer.numItems);
			}

			// draw nucleotide platforms
			platform.bindBuffers(gl);
			// colors
			if (specs.nucleics_residueColor === 'none' && !specs.macro_colorByChain) {
				gl.material.setDiffuseColor(gl, specs.nucleics_baseColor);
			}
			for ( var i = 0, ii = chain.length - 1; i < ii; i++) {
				var residue = chain[i];
				var p2 = residue.cp2;
				var transform = m4.translate(m4.identity(), [ p2.x, p2.y, p2.z ]);
				// rotate to direction
				var y = [ 0, 1, 0 ];
				var ang = 0;
				var axis;
				var p3 = residue.cp3;
				if(p3){
					var a2b = [ p3.x - p2.x, p3.y - p2.y, p3.z - p2.z ];
					if (p2.x === p3.x && p2.z === p3.z) {
						axis = [ 0, 0, 1 ];
						if (p2.y < p2.y) {
							ang = m.PI;
						}
					} else {
						ang = extensions.vec3AngleFrom(y, a2b);
						axis = v3.cross(y, a2b, []);
					}
					if (ang !== 0) {
						m4.rotate(transform, ang, axis);
					}
					// rotate to orientation
					var x = [ 1, 0, 0 ];
					var rM = m4.rotate(m4.identity([]), ang, axis);
					m4.multiplyVec3(rM, x);
					var p4 = residue.cp4;
					var p5 = residue.cp5;
					if (!(p4.y === p5.y && p4.z === p5.z)) {
						var pivot = [ p5.x - p4.x, p5.y - p4.y, p5.z - p4.z ];
						var ang2 = extensions.vec3AngleFrom(x, pivot);
						if (v3.dot(a2b, v3.cross(x, pivot)) < 0) {
							ang2 *= -1;
						}
						m4.rotateY(transform, ang2);
					}
					// color
					if (!specs.macro_colorByChain) {
						if (specs.nucleics_residueColor === 'shapely') {
							if (RESIDUE[residue.name]) {
								gl.material.setDiffuseColor(gl, RESIDUE[residue.name].shapelyColor);
							} else {
								gl.material.setDiffuseColor(gl, RESIDUE['*'].shapelyColor);
							}
						} else if (specs.nucleics_residueColor === 'rainbow') {
							gl.material.setDiffuseColor(gl, math.rainbowAt(i, ii, specs.macro_rainbowColors));
						}
					}
					// render
					gl.shader.setMatrixUniforms(gl, transform);
					gl.drawElements(gl.TRIANGLES, platform.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
				}
			}

		};
	};
	d3.Tube.prototype = new d3._Mesh();

	d3.CatmullTube = function(chains, thickness, cylinderResolution, horizontalResolution) {
		var chain = [];
		chains.push(chains[chains.length - 1]);
		for ( var i = 0, ii = chains.length - 2; i <= ii; i++) {
			var p0 = chains[i == 0 ? 0 : i - 1];
			var p1 = chains[i + 0];
			var p2 = chains[i + 1];
			var p3 = chains[i == ii ? i + 1 : i + 2];

			var segments = [];

			for(var j = 0; j < horizontalResolution; j++) {

				var t = j / horizontalResolution;
				if(i == ii) {
					t = j / (horizontalResolution-1);
				}

				var x = 0.5 * ((2 * p1.x) +
                      (p2.x - p0.x) * t +
                      (2*p0.x - 5*p1.x + 4*p2.x - p3.x) * t * t +
                      (3*p1.x - p0.x - 3 * p2.x + p3.x) * t * t * t);
				var y = 0.5 * ((2 * p1.y) +
                      (p2.y - p0.y) * t +
                      (2*p0.y - 5*p1.y + 4*p2.y - p3.y) * t * t +
                      (3*p1.y -p0.y - 3 * p2.y + p3.y) * t * t * t);
				var z = 0.5 * ((2 * p1.z) +
                      (p2.z - p0.z) * t +
                      (2*p0.z - 5*p1.z + 4*p2.z - p3.z) * t * t +
                      (3*p1.z -p0.z - 3 * p2.z + p3.z) * t * t * t);

				var o = new structures.Atom('C', x, y, z);
				segments.push(o);
			}

			chain.push(segments);
		}

		var lineSegmentNum = chain[0].length;
		this.partitions = [];
		var currentPartition;
		this.ends = [];
		this.ends.push(chain[0][0]);
		this.ends.push(chain[chain.length - 1][0]);

		// calculate vertex and normal points
		var last = [ 1, 0, 0 ];
		for ( var i = 0, ii = chain.length; i < ii; i++) {
			if (!currentPartition || currentPartition.positionData.length > 65000) {
				if (this.partitions.length > 0) {
					i--;
				}
				currentPartition = {
					count : 0,
					positionData : [],
					normalData : [],
					indexData : []
				};
				this.partitions.push(currentPartition);
			}

			var residue = chain[i];

			currentPartition.count++;
			var min = Infinity;
			// var p = new structures.Atom('', chain[i].cp1.x, chain[i].cp1.y, chain[i].cp1.z);
			for ( var j = 0; j < lineSegmentNum; j++) {
				var currentPoint = residue[j];
				var nextPoint;
				if (j === lineSegmentNum - 1) {
					if (i === chain.length - 1) {
						nextPoint = residue[j - 1];
					} else {
						nextPoint = chain[i + 1][0];
					}
				} else {
					nextPoint = residue[j + 1];
				}

				var axis = [ nextPoint.x - currentPoint.x, nextPoint.y - currentPoint.y, nextPoint.z - currentPoint.z ];
				v3.normalize(axis);
				if (i === chain.length - 1 && j === lineSegmentNum - 1) {
					v3.scale(axis, -1);
				}
				var startVector = v3.cross(axis, last, []);
				v3.normalize(startVector);
				v3.scale(startVector, thickness / 2);
				var rotator = new PointRotator(startVector, axis, 2 * Math.PI / cylinderResolution);
				for ( var k = 0, kk = cylinderResolution; k < kk; k++) {
					var use = rotator.rotate();
					if (k === m.floor(cylinderResolution / 4)) {
						last = [ use[0], use[1], use[2] ];
					}
					currentPartition.normalData.push(use[0], use[1], use[2]);
					currentPartition.positionData.push(currentPoint.x + use[0], currentPoint.y + use[1], currentPoint.z + use[2]);
				}
			}
		}

		// build mesh connectivity
		for ( var n = 0, nn = this.partitions.length; n < nn; n++) {
			var currentPartition = this.partitions[n];
			for ( var i = 0, ii = currentPartition.count - 1; i < ii; i++) {
				var indexStart = i * lineSegmentNum * cylinderResolution;
				for ( var j = 0, jj = lineSegmentNum; j < jj; j++) {
					var segmentIndexStart = indexStart + j * cylinderResolution;
					for ( var k = 0; k <= cylinderResolution; k++) {
						var sk = segmentIndexStart + k % cylinderResolution;
						currentPartition.indexData.push(sk, sk + cylinderResolution);
					}
				}
			}
		}

		this.storeData(this.partitions[0].positionData, this.partitions[0].normalData, this.partitions[0].indexData);
	};
	var _ = d3.CatmullTube.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		// draw tube
		this.bindBuffers(gl);

		// render
		for ( var i = 0, ii = this.partitions.length; i < ii; i++) {
			var p = this.partitions[i];
			loadPartition(gl, p);
			// render
			gl.drawElements(gl.TRIANGLE_STRIP, p.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}

		// draw ends
		gl.sphereBuffer.bindBuffers(gl);
		for ( var i = 0; i < 2; i++) {
			var p = this.ends[i];
			var transform = m4.translate(m4.identity(), [ p.x, p.y, p.z ]);
			var radius = specs.proteins_tubeThickness / 2;
			m4.scale(transform, [ radius, radius, radius ]);
			// render
			gl.shader.setMatrixUniforms(gl, transform);
			gl.drawElements(gl.TRIANGLES, gl.sphereBuffer.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}
	};

})(ChemDoodle.extensions, ChemDoodle.RESIDUE, ChemDoodle.structures, ChemDoodle.structures.d3, Math, ChemDoodle.lib.mat4, ChemDoodle.lib.vec3, ChemDoodle.math);

(function(d3, v3, undefined) {
	'use strict';
	d3.UnitCell = function(unitCellVectors) {
		this.unitCell = unitCellVectors;
		var positionData = [];
		var normalData = [];
		// calculate vertex and normal points

		var pushSide = function(p1, p2, p3, p4) {
			positionData.push(p1[0], p1[1], p1[2]);
			positionData.push(p2[0], p2[1], p2[2]);
			positionData.push(p3[0], p3[1], p3[2]);
			positionData.push(p4[0], p4[1], p4[2]);
			// push 0s for normals so shader gives them full color
			for ( var i = 0; i < 4; i++) {
				normalData.push(0, 0, 0);
			}
		};
		pushSide(unitCellVectors.o, unitCellVectors.x, unitCellVectors.xy, unitCellVectors.y);
		pushSide(unitCellVectors.o, unitCellVectors.y, unitCellVectors.yz, unitCellVectors.z);
		pushSide(unitCellVectors.o, unitCellVectors.z, unitCellVectors.xz, unitCellVectors.x);
		pushSide(unitCellVectors.yz, unitCellVectors.y, unitCellVectors.xy, unitCellVectors.xyz);
		pushSide(unitCellVectors.xyz, unitCellVectors.xz, unitCellVectors.z, unitCellVectors.yz);
		pushSide(unitCellVectors.xy, unitCellVectors.x, unitCellVectors.xz, unitCellVectors.xyz);

		// build mesh connectivity
		var indexData = [];
		for ( var i = 0; i < 6; i++) {
			var start = i * 4;
			// sides
			indexData.push(start, start + 1, start + 1, start + 2, start + 2, start + 3, start + 3, start);
		}

		this.storeData(positionData, normalData, indexData);
	};
	var _ = d3.UnitCell.prototype = new d3._Mesh();
	_.render = function(gl, specs) {
		gl.shader.setMatrixUniforms(gl);
		this.bindBuffers(gl);
		// colors
		gl.material.setDiffuseColor(gl, specs.shapes_color);
		gl.lineWidth(specs.shapes_lineWidth);
		// render
		gl.drawElements(gl.LINES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.vec3);

(function(d3, math, document, undefined) {
	'use strict';
	d3.Framebuffer = function() {
	};
	var _ = d3.Framebuffer.prototype;

	_.init = function(gl) {
		this.framebuffer = gl.createFramebuffer();
	};

	_.setColorTexture = function(gl, texture, attachment) {
		var i = attachment === undefined ? 0 : attachment;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};
	_.setColorRenderbuffer = function(gl, renderbuffer, attachment) {
		var i = attachment === undefined ? 0 : attachment;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.RENDERBUFFER, renderbuffer);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};
	_.setDepthTexture = function(gl, texture) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};
	_.setDepthRenderbuffer = function(gl, renderbuffer) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	};
	_.bind = function(gl, width, height) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		gl.viewport(0, 0, width, height);
	};

})(ChemDoodle.structures.d3, ChemDoodle.math, document);

(function(d3, math, document, undefined) {
	'use strict';
	d3.Renderbuffer = function() {
	};
	var _ = d3.Renderbuffer.prototype;

	_.init = function(gl, format) {
		this.renderbuffer = gl.createRenderbuffer();
		this.format = format;
	};

	_.setParameter = function(gl, width, height) {
		this.width = width;
		this.height = height;
		
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, this.format, this.width, this.height);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	};

})(ChemDoodle.structures.d3, ChemDoodle.math, document);

(function(math, d3, m, undefined) {
	'use strict';
	d3.SSAO = function() {
	};
	var _ = d3.SSAO.prototype;

	_.initSampleKernel = function(kernelSize) {
		var sampleKernel = [];

		for(var i = 0; i < kernelSize; i++) {
			var x = m.random() * 2.0 - 1.0;
			var y = m.random() * 2.0 - 1.0;
			var z = m.random() * 2.0 - 1.0;

			var scale = i / kernelSize;
			var scale2 = scale * scale;
			var lerp = 0.1 + scale2 * 0.9;

			x *= lerp;
			y *= lerp;
			z *= lerp;

			sampleKernel.push(x, y, z);
		}

		this.sampleKernel = new Float32Array(sampleKernel);
	};

	_.initNoiseTexture = function(gl) {
		var noiseSize = 16;
		var ssaoNoise = [];

		for(var i = 0; i < noiseSize; i++) {
			ssaoNoise.push(m.random() * 2 - 1);
			ssaoNoise.push(m.random() * 2 - 1);
			ssaoNoise.push(0.0);
		}

		this.noiseTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 4, 4, 0, gl.RGB, gl.FLOAT, new Float32Array(ssaoNoise));
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		gl.bindTexture(gl.TEXTURE_2D, null);
	};

})(ChemDoodle.math, ChemDoodle.structures.d3, Math);

(function(d3, math, document, undefined) {
	'use strict';
	d3.Texture = function() {
	};
	var _ = d3.Texture.prototype;

	_.init = function(gl, type, internalFormat, format) {
		this.texture = gl.createTexture();
		this.type = type;
		this.internalFormat = internalFormat;
		this.format = format !== undefined ? format : internalFormat;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
	};
	_.setParameter = function(gl, width, height) {
		this.width = width;
		this.height = height;

		// set texture dimension
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, this.internalFormat, this.width, this.height, 0, this.format, this.type, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	};

})(ChemDoodle.structures.d3, ChemDoodle.math, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';
	d3._Shader = function() {
	};
	var _ = d3._Shader.prototype;
	_.useShaderProgram = function(gl) {
		gl.useProgram(this.gProgram);
		gl.shader = this;
	};
	_.init = function(gl) {
		var vertexShader = this.getShader(gl, 'vertex-shader');
		if (!vertexShader) {
			vertexShader = this.loadDefaultVertexShader(gl);
		}
		var fragmentShader = this.getShader(gl, 'fragment-shader');
		if (!fragmentShader) {
			fragmentShader = this.loadDefaultFragmentShader(gl);
		}

		this.gProgram = gl.createProgram();

		gl.attachShader(this.gProgram, vertexShader);
		gl.attachShader(this.gProgram, fragmentShader);
		
		this.onShaderAttached(gl);

		gl.linkProgram(this.gProgram);

		if (!gl.getProgramParameter(this.gProgram, gl.LINK_STATUS)) {
			alert('Could not initialize shaders: ' + gl.getProgramInfoLog(this.gProgram));
		}

		gl.useProgram(this.gProgram);
		this.initUniformLocations(gl);
		gl.useProgram(null);
	};
	_.onShaderAttached = function(gl) {
		// set vertex attributes explicitly
		this.vertexPositionAttribute = 0;
		this.vertexNormalAttribute = 1;

		gl.bindAttribLocation(this.gProgram, this.vertexPositionAttribute, 'a_vertex_position');
		gl.bindAttribLocation(this.gProgram, this.vertexNormalAttribute, 'a_vertex_normal');
	};
	_.getShaderFromStr = function(gl, shaderType, strSrc) {
		var shader = gl.createShader(shaderType);
		gl.shaderSource(shader, strSrc);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(shaderScript.type + ' ' + gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return undefined;
		}
		return shader;
	};
	_.enableAttribsArray = function(gl) {
		gl.enableVertexAttribArray(this.vertexPositionAttribute);
	};
	_.disableAttribsArray = function(gl) {
		gl.disableVertexAttribArray(this.vertexPositionAttribute);
	};
	_.getShader = function(gl, id) {
		var shaderScript = document.getElementById(id);
		if (!shaderScript) {
			return undefined;
		}
		var sb = [];
		var k = shaderScript.firstChild;
		while (k) {
			if (k.nodeType === 3) {
				sb.push(k.textContent);
			}
			k = k.nextSibling;
		}
		var sdrSrc = sb.join('');
		var shader;
		if (shaderScript.type === 'x-shader/x-fragment') {
			shader = this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sdrSrc);
		} else if (shaderScript.type === 'x-shader/x-vertex') {
			shader = this.getShaderFromStr(gl, gl.VERTEX_SHADER, sdrSrc);
		} else {
			return undefined;
		}
		return shader;
	};
	_.initUniformLocations = function(gl) {
		this.modelViewMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_model_view_matrix');
		this.projectionMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_projection_matrix');
	};
	_.loadDefaultVertexShader = function(gl) {
	};
	_.loadDefaultFragmentShader = function(gl) {
	};
	_.setMatrixUniforms = function(gl, modelMatrix) {
		if(modelMatrix === undefined) {
			this.setModelViewMatrix(gl, gl.modelViewMatrix);
		} else {
			this.setModelViewMatrix(gl, m4.multiply(gl.modelViewMatrix, modelMatrix, []));
		}
	};
	_.setProjectionMatrix = function(gl, matrix) {
		gl.uniformMatrix4fv(this.projectionMatrixUniform, false, matrix);
	};
	_.setModelViewMatrix = function(gl, mvMatrix) {
		gl.uniformMatrix4fv(this.modelViewMatrixUniform, false, mvMatrix);
	};
	_.setMaterialAmbientColor = function(gl, ambient) {
	};
	_.setMaterialDiffuseColor = function(gl, diffuse) {
	};
	_.setMaterialSpecularColor = function(gl, specular) {
	};
	_.setMaterialShininess = function(gl, shininess) {
	};
	_.setMaterialAlpha = function(gl, alpha) {
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.FXAAShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.FXAAShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		// assign uniform properties
		_super.initUniformLocations.call(this, gl);
		this.buffersizeUniform = gl.getUniformLocation(this.gProgram, 'u_buffersize');
		this.antialiasUniform = gl.getUniformLocation(this.gProgram, 'u_antialias');

		this.edgeThresholdUniform = gl.getUniformLocation(this.gProgram, 'u_edge_threshold');
		this.edgeThresholdMinUniform = gl.getUniformLocation(this.gProgram, 'u_edge_threshold_min');
		this.searchStepsUniform = gl.getUniformLocation(this.gProgram, 'u_search_steps');
		this.searchThresholdUniform = gl.getUniformLocation(this.gProgram, 'u_search_threshold');
		this.subpixCapUniform = gl.getUniformLocation(this.gProgram, 'u_subpix_cap');
		this.subpixTrimUniform = gl.getUniformLocation(this.gProgram, 'u_subpix_trim');
	};
	_.setBuffersize = function(gl, width, height) {
		gl.uniform2f(this.buffersizeUniform, width, height);
	};
	_.setAntialias = function(gl, val) {
		gl.uniform1f(this.antialiasUniform, val);
	};
	_.setEdgeThreshold = function(gl, val) {
		gl.uniform1f(this.edgeThresholdUniform, val);
	};
	_.setEdgeThresholdMin = function(gl, val) {
		gl.uniform1f(this.edgeThresholdMinUniform, val);
	};
	_.setSearchSteps = function(gl, val) {
		gl.uniform1i(this.searchStepsUniform, val);
	};
	_.setSearchThreshold = function(gl, val) {
		gl.uniform1f(this.searchThresholdUniform, val);
	};
	_.setSubpixCap = function(gl, val) {
		gl.uniform1f(this.subpixCapUniform, val);
	};
	_.setSubpixTrim = function(gl, val) {
		gl.uniform1f(this.subpixTrimUniform, val);
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

    	'varying vec2 v_texcoord;',

		'void main() {',
			'gl_Position = vec4(a_vertex_position, 1.);',
        	'v_texcoord = a_vertex_position.xy * .5 + .5;',
		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};

	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		'precision mediump float;',

		'const int fxaaMaxSearchSteps = 128;',

		'uniform float u_edge_threshold;',
		'uniform float u_edge_threshold_min;',
		'uniform int u_search_steps;',
		'uniform float u_search_threshold;',
		'uniform float u_subpix_cap;',
		'uniform float u_subpix_trim;',

		'uniform sampler2D u_sampler0;',
		'uniform vec2 u_buffersize;',
		'uniform bool u_antialias;',

		'varying vec2 v_texcoord;',

		'float FxaaLuma(vec3 rgb) {',
			'return rgb.y * (0.587/0.299) + rgb.x;',
		'}',

		'vec3 FxaaLerp3(vec3 a, vec3 b, float amountOfA) {',
		    'return (vec3(-amountOfA) * b) + ((a * vec3(amountOfA)) + b);',
		'}',

		'vec4 FxaaTexOff(sampler2D tex, vec2 pos, vec2 off, vec2 rcpFrame) {',
		    'return texture2D(tex, pos + off * rcpFrame);',
		'}',

		'vec3 FxaaPixelShader(vec2 pos, sampler2D tex, vec2 rcpFrame) {',
			'float subpix_trim_scale = (1.0/(1.0 - u_subpix_trim));',
		    'vec3 rgbN = FxaaTexOff(tex, pos.xy, vec2( 0.,-1.), rcpFrame).xyz;',
		    'vec3 rgbW = FxaaTexOff(tex, pos.xy, vec2(-1., 0.), rcpFrame).xyz;',
		    'vec3 rgbM = FxaaTexOff(tex, pos.xy, vec2( 0., 0.), rcpFrame).xyz;',
		    'vec3 rgbE = FxaaTexOff(tex, pos.xy, vec2( 1., 0.), rcpFrame).xyz;',
		    'vec3 rgbS = FxaaTexOff(tex, pos.xy, vec2( 0., 1.), rcpFrame).xyz;',

		    'float lumaN = FxaaLuma(rgbN);',
		    'float lumaW = FxaaLuma(rgbW);',
		    'float lumaM = FxaaLuma(rgbM);',
		    'float lumaE = FxaaLuma(rgbE);',
		    'float lumaS = FxaaLuma(rgbS);',
		    'float rangeMin = min(lumaM, min(min(lumaN, lumaW), min(lumaS, lumaE)));',
		    'float rangeMax = max(lumaM, max(max(lumaN, lumaW), max(lumaS, lumaE)));',

		    'float range = rangeMax - rangeMin;',
		    'if(range < max(u_edge_threshold_min, rangeMax * u_edge_threshold)) {',
		        'return rgbM;',
		    '}',

		    'vec3 rgbL = rgbN + rgbW + rgbM + rgbE + rgbS;',

		    'float lumaL = (lumaN + lumaW + lumaE + lumaS) * 0.25;',
		    'float rangeL = abs(lumaL - lumaM);',
		    'float blendL = max(0.0, (rangeL / range) - u_subpix_trim) * subpix_trim_scale;',
		    'blendL = min(u_subpix_cap, blendL);',

		    'vec3 rgbNW = FxaaTexOff(tex, pos.xy, vec2(-1.,-1.), rcpFrame).xyz;',
		    'vec3 rgbNE = FxaaTexOff(tex, pos.xy, vec2( 1.,-1.), rcpFrame).xyz;',
		    'vec3 rgbSW = FxaaTexOff(tex, pos.xy, vec2(-1., 1.), rcpFrame).xyz;',
		    'vec3 rgbSE = FxaaTexOff(tex, pos.xy, vec2( 1., 1.), rcpFrame).xyz;',
		    'rgbL += (rgbNW + rgbNE + rgbSW + rgbSE);',
		    'rgbL *= vec3(1.0/9.0);',

		    'float lumaNW = FxaaLuma(rgbNW);',
		    'float lumaNE = FxaaLuma(rgbNE);',
		    'float lumaSW = FxaaLuma(rgbSW);',
		    'float lumaSE = FxaaLuma(rgbSE);',

		    'float edgeVert =',
		        'abs((0.25 * lumaNW) + (-0.5 * lumaN) + (0.25 * lumaNE)) +',
		        'abs((0.50 * lumaW ) + (-1.0 * lumaM) + (0.50 * lumaE )) +',
		        'abs((0.25 * lumaSW) + (-0.5 * lumaS) + (0.25 * lumaSE));',
		    'float edgeHorz =',
		        'abs((0.25 * lumaNW) + (-0.5 * lumaW) + (0.25 * lumaSW)) +',
		        'abs((0.50 * lumaN ) + (-1.0 * lumaM) + (0.50 * lumaS )) +',
		        'abs((0.25 * lumaNE) + (-0.5 * lumaE) + (0.25 * lumaSE));',

		    'bool horzSpan = edgeHorz >= edgeVert;',
		    'float lengthSign = horzSpan ? -rcpFrame.y : -rcpFrame.x;',

		    'if(!horzSpan) {',
		        'lumaN = lumaW;',
		        'lumaS = lumaE;',
		    '}',

		    'float gradientN = abs(lumaN - lumaM);',
		    'float gradientS = abs(lumaS - lumaM);',
		    'lumaN = (lumaN + lumaM) * 0.5;',
		    'lumaS = (lumaS + lumaM) * 0.5;',

		    'if (gradientN < gradientS) {',
		        'lumaN = lumaS;',
		        'lumaN = lumaS;',
		        'gradientN = gradientS;',
		        'lengthSign *= -1.0;',
		    '}',

		    'vec2 posN;',
		    'posN.x = pos.x + (horzSpan ? 0.0 : lengthSign * 0.5);',
		    'posN.y = pos.y + (horzSpan ? lengthSign * 0.5 : 0.0);',

		    'gradientN *= u_search_threshold;',

		    'vec2 posP = posN;',
		    'vec2 offNP = horzSpan ? vec2(rcpFrame.x, 0.0) : vec2(0.0, rcpFrame.y);',
		    'float lumaEndN = lumaN;',
		    'float lumaEndP = lumaN;',
		    'bool doneN = false;',
		    'bool doneP = false;',
		    'posN += offNP * vec2(-1.0, -1.0);',
		    'posP += offNP * vec2( 1.0,  1.0);',

		    'for(int i = 0; i < fxaaMaxSearchSteps; i++) {',
		    	'if(i >= u_search_steps) break;',
		        'if(!doneN) {',
		            'lumaEndN = FxaaLuma(texture2D(tex, posN.xy).xyz);',
		        '}',
		        'if(!doneP) {',
		            'lumaEndP = FxaaLuma(texture2D(tex, posP.xy).xyz);',
		        '}',

		        'doneN = doneN || (abs(lumaEndN - lumaN) >= gradientN);',
		        'doneP = doneP || (abs(lumaEndP - lumaN) >= gradientN);',

		        'if(doneN && doneP) {',
		            'break;',
		        '}',
		        'if(!doneN) {',
		            'posN -= offNP;',
		        '}',
		        'if(!doneP) {',
		            'posP += offNP;',
		        '}',
		    '}',

		    'float dstN = horzSpan ? pos.x - posN.x : pos.y - posN.y;',
		    'float dstP = horzSpan ? posP.x - pos.x : posP.y - pos.y;',
		    'bool directionN = dstN < dstP;',
		    'lumaEndN = directionN ? lumaEndN : lumaEndP;',

		    'if(((lumaM - lumaN) < 0.0) == ((lumaEndN - lumaN) < 0.0)) {',
		        'lengthSign = 0.0;',
		    '}',


		    'float spanLength = (dstP + dstN);',
		    'dstN = directionN ? dstN : dstP;',
		    'float subPixelOffset = (0.5 + (dstN * (-1.0/spanLength))) * lengthSign;',
		    'vec3 rgbF = texture2D(tex, vec2(',
		        'pos.x + (horzSpan ? 0.0 : subPixelOffset),',
		        'pos.y + (horzSpan ? subPixelOffset : 0.0))).xyz;',
		    'return FxaaLerp3(rgbL, rgbF, blendL);',
		'}',

		'void main() {',
			'gl_FragColor = texture2D(u_sampler0, v_texcoord);',
			'if(u_antialias) {',
				'gl_FragColor.xyz = FxaaPixelShader(v_texcoord, u_sampler0, 1. / u_buffersize).xyz;',
			'}',
		'}'
		].join('\n');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';
	d3.LabelShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.LabelShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		this.dimensionUniform = gl.getUniformLocation(this.gProgram, 'u_dimension');
	};
	_.onShaderAttached = function(gl) {
		_super.onShaderAttached.call(this, gl);
		this.vertexTexCoordAttribute = 2;
		gl.bindAttribLocation(this.gProgram, this.vertexTexCoordAttribute, 'a_vertex_texcoord');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',
		'attribute vec3 a_vertex_normal;',
		'attribute vec2 a_vertex_texcoord;',

		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',
		'uniform vec2 u_dimension;',

		// sent to the fragment shader
		'varying vec2 v_texcoord;',

		'void main() {',

			'gl_Position = u_model_view_matrix * vec4(a_vertex_position, 1.);',

			'vec4 depth_pos = vec4(gl_Position);',

			'depth_pos.z += a_vertex_normal.z;',

			'gl_Position = u_projection_matrix * gl_Position;',

			'depth_pos = u_projection_matrix * depth_pos;',

			'gl_Position /= gl_Position.w;',

			'gl_Position.xy += a_vertex_normal.xy / u_dimension * 2.;',

			'gl_Position.z = depth_pos.z / depth_pos.w;',

			'v_texcoord = a_vertex_texcoord;',

		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set macro for depth mmap texture
		gl.depthTextureExt ? '#define CWC_DEPTH_TEX\n' : '',
		
		// set float precision
		'precision mediump float;',

		// texture for draw text nor shadow map
		'uniform sampler2D u_image;',
					
		// from the vertex shader
		'varying vec2 v_texcoord;',

		'void main(void) {',
			'gl_FragColor = texture2D(u_image, v_texcoord);',
		'}'
		].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.enableAttribsArray = function(gl) {
		_super.enableAttribsArray.call(this, gl);
		gl.enableVertexAttribArray(this.vertexNormalAttribute);
		gl.enableVertexAttribArray(this.vertexTexCoordAttribute);
	};
	_.disableAttribsArray = function(gl) {
		_super.disableAttribsArray.call(this, gl);
		gl.disableVertexAttribArray(this.vertexNormalAttribute);
		gl.disableVertexAttribArray(this.vertexTexCoordAttribute);
	};
	_.setDimension = function(gl, width, height) {
		gl.uniform2f(this.dimensionUniform, width, height);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.LightingShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.LightingShader.prototype = new d3._Shader();
	
	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		// assign uniform properties
		this.positionSampleUniform = gl.getUniformLocation(this.gProgram, 'u_position_sample');
		this.colorSampleUniform = gl.getUniformLocation(this.gProgram, 'u_color_sample');
		this.ssaoSampleUniform = gl.getUniformLocation(this.gProgram, 'u_ssao_sample');
		this.outlineSampleUniform = gl.getUniformLocation(this.gProgram, 'u_outline_sample');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

		// sent to the fragment shader
    	'varying vec2 v_texcoord;',

		'void main() {',
			'gl_Position = vec4(a_vertex_position, 1.);',
        	'v_texcoord = a_vertex_position.xy * .5 + .5;',
		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [

		// set float precision
		'precision mediump float;',

	    'uniform sampler2D u_position_sample;',
	    'uniform sampler2D u_color_sample;',
		'uniform sampler2D u_ssao_sample;',
		'uniform sampler2D u_outline_sample;',
	    
    	'varying vec2 v_texcoord;',

	    'void main() {',
	    	'vec4 position = texture2D(u_position_sample, v_texcoord);',
	    	'vec4 color = texture2D(u_color_sample, v_texcoord);',
			'vec4 ao = texture2D(u_ssao_sample, v_texcoord);',
			'float outline = texture2D(u_outline_sample, v_texcoord).r;',

			// skip background color
	    	'if(position.w == 0. && outline == 1.) {',
				// 'gl_FragColor = vec4(0., 0., 0., 1.);',
	    		'return;',
	    	'}',

			'gl_FragColor = vec4(color.rgb * ao.r * outline, 1.);',
	    '}'].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.NormalShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.NormalShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		// assign uniform properties
		this.normalMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_normal_matrix');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',
		'attribute vec3 a_vertex_normal;',

		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',
		'uniform mat3 u_normal_matrix;',

		// sent to the fragment shader
		'varying vec3 v_normal;',

		'void main() {',

			'v_normal = length(a_vertex_normal)==0. ? a_vertex_normal : u_normal_matrix * a_vertex_normal;',
			
			'gl_Position = u_projection_matrix * u_model_view_matrix * vec4(a_vertex_position, 1.);',

		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		
		// set float precision
		'precision mediump float;',
					
		'varying vec3 v_normal;',

		'void main(void) {',
			'vec3 normal = length(v_normal)==0. ? vec3(0., 0., 1.) : normalize(v_normal);',
			'gl_FragColor = vec4(normal, 0.);',
		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.enableAttribsArray = function(gl) {
		_super.enableAttribsArray.call(this, gl);
		gl.enableVertexAttribArray(this.vertexNormalAttribute);
	};
	_.disableAttribsArray = function(gl) {
		_super.disableAttribsArray.call(this, gl);
		gl.disableVertexAttribArray(this.vertexNormalAttribute);
	};
	_.setModelViewMatrix = function(gl, mvMatrix) {
		_super.setModelViewMatrix.call(this, gl, mvMatrix);
		// create the normal matrix and push it to the graphics card
		var normalMatrix = m3.transpose(m4.toInverseMat3(mvMatrix, []));
		gl.uniformMatrix3fv(this.normalMatrixUniform, false, normalMatrix);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.OutlineShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.OutlineShader.prototype = new d3._Shader();

	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		this.normalSampleUniform = gl.getUniformLocation(this.gProgram, 'u_normal_sample');
		this.depthSampleUniform = gl.getUniformLocation(this.gProgram, 'u_depth_sample');
		this.gbufferTextureSizeUniform = gl.getUniformLocation(this.gProgram, 'u_gbuffer_texture_size');

		this.normalThresholdUniform = gl.getUniformLocation(this.gProgram, 'u_normal_threshold');
		this.depthThresholdUniform = gl.getUniformLocation(this.gProgram, 'u_depth_threshold');
		this.thicknessUniform = gl.getUniformLocation(this.gProgram, 'u_thickness');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

    	'varying vec2 v_texcoord;',

		'void main() {',
			'gl_Position = vec4(a_vertex_position, 1.);',
        	'v_texcoord = a_vertex_position.xy * .5 + .5;',
		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set float precision
		'precision mediump float;',

	    'uniform sampler2D u_normal_sample;',
	    'uniform sampler2D u_depth_sample;',

	    'uniform float u_normal_threshold;',
	    'uniform float u_depth_threshold;',

	    'uniform float u_thickness;',

	    'uniform vec2 u_gbuffer_texture_size;',

	    
	    'varying vec2 v_texcoord;',

	    'void main() {',
	    	'vec3 normal = texture2D(u_normal_sample, v_texcoord).xyz;',
	    	'float depth = texture2D(u_depth_sample, v_texcoord).r;',

	    	// check background pixel
	    	// 'if(depth == 1.) {',
	    	// 	'return;',
	    	// '}',

	    	'vec2 texelSize = u_thickness/u_gbuffer_texture_size * .5;',
	    	'vec2 offsets[8];',

			'offsets[0] = vec2(-texelSize.x, -texelSize.y);',
			'offsets[1] = vec2(-texelSize.x, 0);',
			'offsets[2] = vec2(-texelSize.x, texelSize.y);',

			'offsets[3] = vec2(0, -texelSize.y);',
			'offsets[4] = vec2(0,  texelSize.y);',

			'offsets[5] = vec2(texelSize.x, -texelSize.y);',
			'offsets[6] = vec2(texelSize.x, 0);',
			'offsets[7] = vec2(texelSize.x, texelSize.y);',

			'float edge = 0.;',

			'for (int i = 0; i < 8; i++) {',
				'vec3 sampleNorm = texture2D(u_normal_sample, v_texcoord + offsets[i]).xyz;',

				'if(normal == vec3(.0, .0, .0)) {',
					'if(sampleNorm != vec3(.0, .0, .0)) {',
						'edge = 1.0;',
						'break;',
					'}',
					'continue;',
				'}',

				'if (dot(sampleNorm, normal) < u_normal_threshold) {',
					'edge = 1.0;',
					'break;',
				'}',

				'float sampleDepth = texture2D(u_depth_sample, v_texcoord + offsets[i]).r;',
				'if (abs(sampleDepth - depth) > u_depth_threshold) {',
					'edge = 1.0;',
					'break;',
				'}',
			'}',

			'edge = 1. - edge;',

		    'gl_FragColor = vec4(edge, edge, edge, 1.);',
	    '}'].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.setGbufferTextureSize = function(gl, width, height) {
		gl.uniform2f(this.gbufferTextureSizeUniform, width, height);
	};
	_.setNormalThreshold = function(gl, value) {
		gl.uniform1f(this.normalThresholdUniform, value);
	};
	_.setDepthThreshold = function(gl, value) {
		gl.uniform1f(this.depthThresholdUniform, value);
	};
	_.setThickness = function(gl, value) {
		gl.uniform1f(this.thicknessUniform, value);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.PhongShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.PhongShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		_super.initUniformLocations.call(this, gl);
		// assign uniform properties
		this.shadowUniform = gl.getUniformLocation(this.gProgram, 'u_shadow');
		this.flatColorUniform = gl.getUniformLocation(this.gProgram, 'u_flat_color');
		this.normalMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_normal_matrix');
		
		this.lightModelViewMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_light_model_view_matrix');
		this.lightProjectionMatrixUniform = gl.getUniformLocation(this.gProgram, 'u_light_projection_matrix');

		this.lightDiffuseColorUniform = gl.getUniformLocation(this.gProgram, 'u_light_diffuse_color');
		this.lightSpecularColorUniform = gl.getUniformLocation(this.gProgram, 'u_light_specular_color');
		this.lightDirectionUniform = gl.getUniformLocation(this.gProgram, 'u_light_direction');

		this.materialAmbientColorUniform = gl.getUniformLocation(this.gProgram, 'u_material_ambient_color');
		this.materialDiffuseColorUniform = gl.getUniformLocation(this.gProgram, 'u_material_diffuse_color');
		this.materialSpecularColorUniform = gl.getUniformLocation(this.gProgram, 'u_material_specular_color');
		this.materialShininessUniform = gl.getUniformLocation(this.gProgram, 'u_material_shininess');
		this.materialAlphaUniform = gl.getUniformLocation(this.gProgram, 'u_material_alpha');

		this.fogModeUniform = gl.getUniformLocation(this.gProgram, 'u_fog_mode');
		this.fogColorUniform = gl.getUniformLocation(this.gProgram, 'u_fog_color');
		this.fogStartUniform = gl.getUniformLocation(this.gProgram, 'u_fog_start');
		this.fogEndUniform = gl.getUniformLocation(this.gProgram, 'u_fog_end');
		this.fogDensityUniform = gl.getUniformLocation(this.gProgram, 'u_fog_density');

		// texture for shadow map
		this.shadowDepthSampleUniform = gl.getUniformLocation(this.gProgram, 'u_shadow_depth_sample');
		this.shadowTextureSizeUniform = gl.getUniformLocation(this.gProgram, 'u_shadow_texture_size');
		this.shadowIntensityUniform = gl.getUniformLocation(this.gProgram, 'u_shadow_intensity');
		
		// gamma correction
		this.gammaCorrectionUniform = gl.getUniformLocation(this.gProgram, 'u_gamma_inverted');
		
		// point size
		this.pointSizeUniform = gl.getUniformLocation(this.gProgram, 'u_point_size');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',
		'attribute vec3 a_vertex_normal;',

		// scene uniforms
		'uniform vec3 u_light_diffuse_color;',
		'uniform vec3 u_material_ambient_color;',
		'uniform vec3 u_material_diffuse_color;',
		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',
		'uniform mat3 u_normal_matrix;',

		'uniform mat4 u_light_model_view_matrix;',
		'uniform mat4 u_light_projection_matrix;',

		'uniform bool u_shadow;',

		// sent to the fragment shader
		'varying vec3 v_viewpos;',
  		'varying vec4 v_shadcoord;',
		'varying vec3 v_diffuse;',
		'varying vec3 v_ambient;',
		'varying vec3 v_normal;',
		
		'uniform float u_point_size;',

		'void main() {',

			'v_normal = length(a_vertex_normal)==0. ? a_vertex_normal : u_normal_matrix * a_vertex_normal;',
			'v_ambient = u_material_ambient_color;',
			'v_diffuse = u_material_diffuse_color * u_light_diffuse_color;',

			'if(u_shadow) {',
				'v_shadcoord = u_light_projection_matrix * u_light_model_view_matrix * vec4(a_vertex_position, 1.);',
				'v_shadcoord /= v_shadcoord.w;',
			'}',

			'vec4 viewPos = u_model_view_matrix * vec4(a_vertex_position, 1.);',

			'v_viewpos = viewPos.xyz / viewPos.w;',
			
			'gl_Position = u_projection_matrix * viewPos;',

			// just to make sure the w is 1
			'gl_Position /= gl_Position.w;',
			'gl_PointSize = u_point_size;',

		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set macro for depth mmap texture
		gl.depthTextureExt ? '#define CWC_DEPTH_TEX\n' : '',
		
		// set float precision
		'precision mediump float;',
					
		// scene uniforms
		'uniform vec3 u_light_specular_color;',
		'uniform vec3 u_light_direction;',

		'uniform vec3 u_material_specular_color;',
		'uniform float u_material_shininess;',
		'uniform float u_material_alpha;',

		'uniform int u_fog_mode;',
		'uniform vec3 u_fog_color;',
		'uniform float u_fog_density;',
		'uniform float u_fog_start;',
		'uniform float u_fog_end;',

		'uniform bool u_shadow;',
		'uniform float u_shadow_intensity;',

		'uniform bool u_flat_color;',
		
		'uniform float u_gamma_inverted;',

		// texture for shadow map
		'uniform sampler2D u_shadow_depth_sample;',

		'uniform vec2 u_shadow_texture_size;',
					
		// from the vertex shader
		'varying vec3 v_viewpos;',
  		'varying vec4 v_shadcoord;',
		'varying vec3 v_diffuse;',
		'varying vec3 v_ambient;',
		'varying vec3 v_normal;',


		'\n#ifndef CWC_DEPTH_TEX\n',
		'float unpack (vec4 colour) {',
			'const vec4 bitShifts = vec4(1.,',
				'1. / 255.,',
				'1. / (255. * 255.),',
				'1. / (255. * 255. * 255.));',
			'return dot(colour, bitShifts);',
		'}',
		'\n#endif\n',

		'float shadowMapDepth(vec4 shadowMapColor) {',
			'float zShadowMap;',
			'\n#ifdef CWC_DEPTH_TEX\n',
			'zShadowMap = shadowMapColor.r;',
			'\n#else\n',
			'zShadowMap = unpack(shadowMapColor);',
			'\n#endif\n',
			'return zShadowMap;',
		'}',

		'void main(void) {',
			'vec3 color = v_diffuse;',
			'if(length(v_normal)!=0.){',
				'vec3 normal = normalize(v_normal);',
				'vec3 lightDir = normalize(-u_light_direction);',
				'float nDotL = dot(normal, lightDir);',

    			'float shadow = 0.0;',
    			'if(u_shadow) {',
					'vec3 depthCoord = .5 + v_shadcoord.xyz / v_shadcoord.w * .5;',

				    'if(depthCoord.z <= 1. && depthCoord.z >= 0.) {',
						'float bias = max(.05 * (1. - nDotL), .005);',
						'vec2 texelSize = 1. / u_shadow_texture_size;',
					    'for(int x = -1; x <= 1; ++x) {',
					        'for(int y = -1; y <= 1; ++y)  {',
								'vec4 shadowMapColor = texture2D(u_shadow_depth_sample, depthCoord.xy + vec2(x, y) * texelSize);',
								'float zShadowMap = shadowMapDepth(shadowMapColor);',
					            'shadow += zShadowMap + bias < depthCoord.z ? 1. : 0.;',
					        '}',
					    '}',
					    'shadow /= 9.;',
					    'shadow *= u_shadow_intensity;',
					'}',
    			'}',

    			'if(!u_flat_color) {',
					'vec3 viewDir = normalize(-v_viewpos);',
					'vec3 halfDir = normalize(lightDir + viewDir);',
					'float nDotHV = max(dot(halfDir, normal), 0.);',
					'vec3 specular = u_material_specular_color * u_light_specular_color;',
					'color*=max(nDotL, 0.);',
					'color+=specular * pow(nDotHV, u_material_shininess);',
				'}',

				// set the color
				'color = (1.-shadow)*color+v_ambient;',
			'}',

			'gl_FragColor = vec4(pow(color, vec3(u_gamma_inverted)), u_material_alpha);',

			'if(u_fog_mode != 0){',
				'float fogCoord = 1.-clamp((u_fog_end - gl_FragCoord.z/gl_FragCoord.w) / (u_fog_end - u_fog_start), 0., 1.);',
				'float fogFactor = 1.;',

				// linear equation
				'if(u_fog_mode == 1){',
					'fogFactor = 1.-fogCoord;',
				'}',
				// exp equation
				'else if(u_fog_mode == 2) {',
					'fogFactor = clamp(exp(-u_fog_density*fogCoord), 0., 1.);',
				'}',
				// exp2 equation
				'else if(u_fog_mode == 3) {',
					'fogFactor = clamp(exp(-pow(u_fog_density*fogCoord, 2.)), 0., 1.);',
				'}',
				'gl_FragColor = mix(vec4(u_fog_color, 1.), gl_FragColor, fogFactor);',

				// for debugging
				// 'gl_FragColor = vec4(vec3(fogFactor), 1.);',
			'}',
		'}'
		].join('');
		
		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.enableAttribsArray = function(gl) {
		_super.enableAttribsArray.call(this, gl);
		gl.enableVertexAttribArray(this.vertexNormalAttribute);
	};
	_.disableAttribsArray = function(gl) {
		_super.disableAttribsArray.call(this, gl);
		gl.disableVertexAttribArray(this.vertexNormalAttribute);
	};
	_.setMatrixUniforms = function(gl, modelMatrix) {
		if(modelMatrix === undefined) {
			this.setModelViewMatrix(gl, gl.modelViewMatrix);
			this.setLightModelViewMatrix(gl, gl.lightViewMatrix);
		} else {
			var mvMatrix = m4.multiply(gl.modelViewMatrix, modelMatrix, []);
			var lightModelViewMatrix = m4.multiply(gl.lightViewMatrix, modelMatrix, []);

			this.setModelViewMatrix(gl, mvMatrix);
			this.setLightModelViewMatrix(gl, lightModelViewMatrix);
		}
	};
	_.setModelViewMatrix = function(gl, mvMatrix) {
		_super.setModelViewMatrix.call(this, gl, mvMatrix);
		// create the normal matrix and push it to the graphics card
		var normalMatrix = m3.transpose(m4.toInverseMat3(mvMatrix, []));
		gl.uniformMatrix3fv(this.normalMatrixUniform, false, normalMatrix);
	};
	_.setFlatColor = function(gl, enabled) {
		gl.uniform1i(this.flatColorUniform, enabled);
	};
	_.setShadow = function(gl, enabled) {
		gl.uniform1i(this.shadowUniform, enabled);
	};
	_.setFogMode = function(gl, mode) {
		gl.uniform1i(this.fogModeUniform, mode);
	};
	_.setFogColor = function(gl, color) {
		gl.uniform3fv(this.fogColorUniform, color);
	};
	_.setFogStart = function(gl, fogStart) {
		gl.uniform1f(this.fogStartUniform, fogStart);
	};
	_.setFogEnd = function(gl, fogEnd) {
		gl.uniform1f(this.fogEndUniform, fogEnd);
	};
	_.setFogDensity = function(gl, density) {
		gl.uniform1f(this.fogDensityUniform, density);
	};
	_.setMaterialAmbientColor = function(gl, ambient) {
		gl.uniform3fv(this.materialAmbientColorUniform, ambient);
	};
	_.setMaterialDiffuseColor = function(gl, diffuse) {
		gl.uniform3fv(this.materialDiffuseColorUniform, diffuse);
	};
	_.setMaterialSpecularColor = function(gl, specular) {
		gl.uniform3fv(this.materialSpecularColorUniform, specular);
	};
	_.setMaterialShininess = function(gl, shininess) {
		gl.uniform1f(this.materialShininessUniform, shininess);
	};
	_.setMaterialAlpha = function(gl, alpha) {
		gl.uniform1f(this.materialAlphaUniform, alpha);
	};
	_.setLightDiffuseColor = function(gl, diffuse) {
		gl.uniform3fv(this.lightDiffuseColorUniform, diffuse);
	};
	_.setLightSpecularColor = function(gl, specular) {
		gl.uniform3fv(this.lightSpecularColorUniform, specular);
	};
	_.setLightDirection = function(gl, direction) {
		gl.uniform3fv(this.lightDirectionUniform, direction);
	};
	_.setLightModelViewMatrix = function(gl, mvMatrix) {
		gl.uniformMatrix4fv(this.lightModelViewMatrixUniform, false, mvMatrix);
	};
	_.setLightProjectionMatrix = function(gl, matrix) {
		gl.uniformMatrix4fv(this.lightProjectionMatrixUniform, false, matrix);
	};
	_.setShadowTextureSize = function(gl, width, height) {
		gl.uniform2f(this.shadowTextureSizeUniform, width, height);
	};
	_.setShadowIntensity = function(gl, intensity) {
		gl.uniform1f(this.shadowIntensityUniform, intensity);
	};
	_.setGammaCorrection = function(gl, gammaCorrection) {
	    // make sure gamma correction is inverted here as it is more efficient in the shader
		gl.uniform1f(this.gammaCorrectionUniform, 1.0/gammaCorrection);
	};
	_.setPointSize = function(gl, pointSize) {
		gl.uniform1f(this.pointSizeUniform, pointSize);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.PickShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.PickShader.prototype = new d3._Shader();
	_.initUniformLocations = function(gl) {
		// assign uniform properties
		_super.initUniformLocations.call(this, gl);
		this.materialDiffuseColorUniform = gl.getUniformLocation(this.gProgram, 'u_material_diffuse_color');
	};
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',

		'void main() {',
			
			'gl_Position = u_projection_matrix * u_model_view_matrix * vec4(a_vertex_position, 1.);',

			// just to make sure the w is 1
			'gl_Position /= gl_Position.w;',

		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set macro for depth mmap texture
		gl.depthTextureExt ? '#define CWC_DEPTH_TEX\n' : '',
		
		// set float precision
		'precision mediump float;',

		'uniform vec3 u_material_diffuse_color;',
					
		'void main(void) {',
			'gl_FragColor = vec4(u_material_diffuse_color, 1.);',
		'}'
		].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};
	_.setMaterialDiffuseColor = function(gl, diffuse) {
		gl.uniform3fv(this.materialDiffuseColorUniform, diffuse);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.PositionShader = function() {
	};
	var _super = d3._Shader.prototype;
	var _ = d3.PositionShader.prototype = new d3._Shader();

	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

		// matrices set by gl.setMatrixUniforms
		'uniform mat4 u_model_view_matrix;',
		'uniform mat4 u_projection_matrix;',

		'varying vec4 v_position;',

		'void main() {',
			'vec4 viewPos = u_model_view_matrix * vec4(a_vertex_position, 1.);',

			'gl_Position = u_projection_matrix * viewPos;',

			'v_position = viewPos / viewPos.w;',

		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [
		// set float precision
		'precision mediump float;',

		'varying vec4 v_position;',

		'void main(void) {',
			'gl_FragColor = v_position;',
		'}'].join('');
		
		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(d3, m3, m4, document, undefined) {
	'use strict';

	d3.QuadShader = function() {
	};
	var _ = d3.QuadShader.prototype = new d3._Shader();
	_.loadDefaultVertexShader = function(gl) {
		var sb = [
		'precision mediump float;',
		
		// attributes set when rendering objects
		'attribute vec3 a_vertex_position;',

    	'varying vec2 v_texcoord;',

		'void main() {',
			'gl_Position = vec4(a_vertex_position, 1.);',
        	'v_texcoord = a_vertex_position.xy * .5 + .5;',
		'}'].join('');

		return this.getShaderFromStr(gl, gl.VERTEX_SHADER, sb);
	};
	_.loadDefaultFragmentShader = function(gl) {
		var sb = [

		// set float precision
		'precision mediump float;',

	    'uniform sampler2D u_image;',

    	'varying vec2 v_texcoord;',
	    
	    'void main() {',
	        'gl_FragColor = texture2D(u_image, v_texcoord);',
	    '}'].join('');

		return this.getShaderFromStr(gl, gl.FRAGMENT_SHADER, sb);
	};

})(ChemDoodle.structures.d3, ChemDoodle.lib.mat3, ChemDoodle.lib.mat4, document);

(function(structures, d3, ELEMENT, MarchingCubes, v3, m, undefined) {
	'use strict';
	
	var Triangle = function(i1, i2, i3){
		this.i1 = i1;
		this.i2 = i2;
		this.i3 = i3;
	};
	
	function getRange(atoms, probeRadius) {
		var r = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity];
		var add = probeRadius + 2;
		for (var i = 0, ii = atoms.length; i<ii; i++) {
			var a = atoms[i];
			r[0] = m.min(r[0], a.x - add);
			r[1] = m.max(r[1], a.x + add);
			r[2] = m.min(r[2], a.y - add);
			r[3] = m.max(r[3], a.y + add);
			r[4] = m.min(r[4], a.z - add);
			r[5] = m.max(r[5], a.z + add);
		}
		return r;
	};
	
	function addPoint(p, points, xs, ys, zs, step) {
		// transform back into real space
		var px = p[0] * step + xs - step;
		var py = p[1] * step + ys - step;
		var pz = p[2] * step + zs - step;
		// find any previous match
		var index = -1;
		var cutoff = 1E-3;
		for (var j = 0, jj = points.length; j < jj; j++) {
			var pj = points[j];
			if (m.abs(pj.x - px) < cutoff && m.abs(pj.y - py) < cutoff && m.abs(pj.z - pz) < cutoff) {
				index = j;
				break;
			}
		}
		if (index == -1) {
			index = points.length;
			points.push(new structures.Atom('C', px, py, pz));
		}
		return index;
	};
	
	d3._Surface = function() {
	};
	var _ = d3._Surface.prototype = new d3._Mesh();
	_.generate = function(xdif, ydif, zdif, step, range, xsteps, ysteps, zsteps){
		// generate the function
		var vals = [];
		var z = range[4] - step;
		for (var k = 0; k < zsteps; k++) {
			var y = range[2] - step;
			for (var j = 0; j < ysteps; j++) {
				var x = range[0] - step;
				for (var i = 0; i < xsteps; i++) {
					vals.push(this.calculate(x, y, z));
					x += step;
				}
				y += step;
			}
			z += step;
		}
		return vals;
	};
	_.build = function(atoms, probeRadius, resolution) {
		var positionData = [];
		var normalData = [];
		var indexData = [];

		// calculate the range of the function
		var range = getRange(atoms, probeRadius);
		var xdif = range[1] - range[0];
		var ydif = range[3] - range[2];
		var zdif = range[5] - range[4];
		var step = m.min(xdif, m.min(ydif, zdif)) / resolution;
		
		// generate the function
		var xsteps = 2 + m.ceil(xdif / step);
		var ysteps = 2 + m.ceil(ydif / step);
		var zsteps = 2 + m.ceil(zdif / step);
		var vals = this.generate(xdif, ydif, zdif, step, range, xsteps, ysteps, zsteps);
		
		// marching cubes
		var mesh = MarchingCubes(vals, [xsteps, ysteps, zsteps]);
		
		// build surface
		var ps = [];
		var is = [];
		for (var i = 0, ii = mesh.vertices.length; i<ii; i++) {
			is.push(addPoint(mesh.vertices[i], ps, range[0], range[2], range[4], step));
		}
		
		// triangles
		var triangles = [];
		for (var i = 0, ii = mesh.faces.length; i < ii; i++) {
			var f = mesh.faces[i];
			var i1 = is[f[0]];
			var i2 = is[f[1]];
			var i3 = is[f[2]];
			triangles.push(new Triangle(i1, i2, i3));
			indexData.push(i1, i2, i3);
		}
		
		// smoothing - 1 pass
		var savedConnections = [];
		for (var i = 0, ii = ps.length; i < ii; i++) {
			var connections = [];
			for (var j = 0, jj = triangles.length; j < jj; j++) {
				var t = triangles[j];
				if (t.i1===i || t.i2===i || t.i3===i) {
					if (t.i1 != i && connections.indexOf(t.i1)===-1) {
						connections.push(t.i1);
					}
					if (t.i2 != i && connections.indexOf(t.i2)===-1) {
						connections.push(t.i2);
					}
					if (t.i3 != i && connections.indexOf(t.i3)===-1) {
						connections.push(t.i3);
					}
				}
			}
			savedConnections.push(connections);
		}
		var tmp = [];
		for (var i = 0, ii = ps.length; i < ii; i++) {
			var pi = ps[i];
			var connections = savedConnections[i];
			var pt = new structures.Atom();
			if (connections.length < 3) {
				pt.x = pi.x;
				pt.y = pi.y;
				pt.z = pi.z;
			} else {
				var wt = 1;
				if (connections.length < 5) {
					wt = .5;
				}
				for (var j = 0, jj = connections.length; j < jj; j++) {
					var pc = ps[connections[j]];
					pt.x+=pc.x;
					pt.y+=pc.y;
					pt.z+=pc.z;
				}
				pt.x += pi.x*wt;
				pt.y += pi.y*wt;
				pt.z += pi.z*wt;
				var scale = 1 / (wt + connections.length);
				pt.x*=scale;
				pt.y*=scale;
				pt.z*=scale;
			}
			tmp.push(pt);
		}
		ps = tmp;
		for (var i = 0, ii = ps.length; i < ii; i++) {
			var pi = ps[i];
			positionData.push(pi.x, pi.y, pi.z);
		}
		
		// normals
		for (var i = 0, ii = triangles.length; i < ii; i++) {
			var t = triangles[i];
			var p1 = ps[t.i1];
			var p2 = ps[t.i2];
			var p3 = ps[t.i3];
			var v12 = [p2.x-p1.x, p2.y-p1.y, p2.z-p1.z];
			var v13 = [p3.x-p1.x, p3.y-p1.y, p3.z-p1.z];
			v3.cross(v12, v13);
			if (isNaN(v12[0])) {
				// for some reason, origin shows up as some points and should be
				// ignored
				v12 = [0,0,0];
			}
			t.normal = v12;
		}
		for (var i = 0, ii = ps.length; i < ii; i++) {
			var sum = [0, 0, 0];
			for (var j = 0, jj = triangles.length; j < jj; j++) {
				var t = triangles[j];
				if (t.i1===i || t.i2===i || t.i3===i) {
					sum[0]+=t.normal[0];
					sum[1]+=t.normal[1];
					sum[2]+=t.normal[2];
				}
			}
			v3.normalize(sum);
			normalData.push(sum[0], sum[1], sum[2]);
		}
		this.storeData(positionData, normalData, indexData);
	};
	_.render = function(gl, specs) {
		if(this.specs){
			specs = this.specs;
		}
		if(!specs.surfaces_display){
			return;
		}
		gl.shader.setMatrixUniforms(gl);
		this.bindBuffers(gl);
		// colors
		gl.material.setTempColors(gl, specs.surfaces_materialAmbientColor_3D, specs.surfaces_color, specs.surfaces_materialSpecularColor_3D, specs.surfaces_materialShininess_3D);
		// alpha must be set after temp colors as that function sets alpha to 1
		gl.material.setAlpha(gl, specs.surfaces_alpha);
		// render
		if(specs.surfaces_style === 'Dots'){
			// dots
			//gl.pointSize(1);
			// pointSize isn't part of WebGL API, so we have to make it a shader uniform in the vertex shader
			gl.shader.setPointSize(gl, specs.shapes_pointSize);
			//gl.drawArrays(gl.POINTS, 0, this.vertexIndexBuffer.numItems);
			gl.drawElements(gl.POINTS, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}else if(specs.surfaces_style === 'Mesh'){
			// mesh
			gl.lineWidth(specs.shapes_lineWidth);
			//gl.polygonMode(gl.FRONT_AND_BACK, gl.LINE);
			gl.drawElements(gl.LINES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
			//gl.polygonMode(gl.FRONT_AND_BACK, gl.FILL);
		}else{
			// solid
			gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}
		
	};

})(ChemDoodle.structures, ChemDoodle.structures.d3, ChemDoodle.ELEMENT, ChemDoodle.lib.MarchingCubes, ChemDoodle.lib.vec3, Math);

(function(structures, d3, ELEMENT, m, undefined) {
	'use strict';
	
	d3.SASSurface = function(atoms, probeRadius, resolution) {
		this.atoms = atoms;
		this.probeRadius = probeRadius;
		this.resolution = resolution;
		this.build(atoms, probeRadius, resolution);
	};
	var _ = d3.SASSurface.prototype = new d3._Surface();
	_.calculate = function(x, y, z) {
		var min = Infinity;
		var p = new structures.Atom('C', x, y, z);
		for (var i = 0, ii = this.atoms.length; i<ii; i++) {
			var a = this.atoms[i];
			var vdwRadius = (ELEMENT[a.label] && ELEMENT[a.label].vdWRadius!==0)?ELEMENT[a.label].vdWRadius:2;
			var distanceCenter = a.distance3D(p) - this.probeRadius;
			var distanceSurface = distanceCenter - vdwRadius;
			min = m.min(min, distanceSurface);
		}
		return min;
	};
	

})(ChemDoodle.structures, ChemDoodle.structures.d3, ChemDoodle.ELEMENT, Math);

(function(structures, d3, ELEMENT, m, undefined) {
	'use strict';
	
	d3.VDWSurface = function(atoms, resolution) {
		this.atoms = atoms;
		this.probeRadius = 0;
		this.resolution = resolution;
		this.build(atoms, 0, resolution);
	};
	var _ = d3.VDWSurface.prototype = new d3._Surface();
	_.calculate = function(x, y, z) {
		var min = Infinity;
		var p = new structures.Atom('C', x, y, z);
		for (var i = 0, ii = this.atoms.length; i<ii; i++) {
			var a = this.atoms[i];
			var vdwRadius = (ELEMENT[a.label] && ELEMENT[a.label].vdWRadius!==0)?ELEMENT[a.label].vdWRadius:2;
			var distanceCenter = a.distance3D(p);
			var distanceSurface = distanceCenter - vdwRadius;
			min = m.min(min, distanceSurface);
		}
		return min;
	};
	

})(ChemDoodle.structures, ChemDoodle.structures.d3, ChemDoodle.ELEMENT, Math);

(function(informatics, structures, undefined) {
	'use strict';
	informatics.HydrogenDeducer = function() {
	};
	var _ = informatics.HydrogenDeducer.prototype;
	_.removeHydrogens = function(molecule, removeStereo) {
		var atoms = [];
		var bonds = [];
		for ( var i = 0, ii = molecule.bonds.length; i < ii; i++) {
			var b = molecule.bonds[i];
			var save = b.a1.label !== 'H' && b.a2.label !== 'H';
			if(!save && (!removeStereo && b.stereo !== structures.Bond.STEREO_NONE)){
				save = true;
			}
			if (save) {
				b.a1.tag = true;
				bonds.push(b);
			}else{
				if(b.a1.label === 'H'){
					b.a1.remove = true;
				}
				if(b.a2.label === 'H'){
					b.a2.remove = true;
				}
			}
		}
		for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
			var a = molecule.atoms[i];
			if (a.remove) {
				a.remove = undefined;
			}else{
				atoms.push(a);
			}
		}
		molecule.atoms = atoms;
		molecule.bonds = bonds;
	};

})(ChemDoodle.informatics, ChemDoodle.structures);
(function(informatics, structures, undefined) {
	'use strict';
	informatics.Splitter = function() {
	};
	var _ = informatics.Splitter.prototype;
	_.split = function(molecule) {
		var mols = [];
		for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
			molecule.atoms[i].visited = false;
		}
		for ( var i = 0, ii = molecule.bonds.length; i < ii; i++) {
			molecule.bonds[i].visited = false;
		}
		for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
			var a = molecule.atoms[i];
			if (!a.visited) {
				var newMol = new structures.Molecule();
				newMol.atoms.push(a);
				a.visited = true;
				var q = new structures.Queue();
				q.enqueue(a);
				while (!q.isEmpty()) {
					var atom = q.dequeue();
					for ( var j = 0, jj = molecule.bonds.length; j < jj; j++) {
						var b = molecule.bonds[j];
						if (b.contains(atom) && !b.visited) {
							b.visited = true;
							newMol.bonds.push(b);
							var neigh = b.getNeighbor(atom);
							if (!neigh.visited) {
								neigh.visited = true;
								newMol.atoms.push(neigh);
								q.enqueue(neigh);
							}
						}
					}
				}
				mols.push(newMol);
			}
		}
		return mols;
	};

})(ChemDoodle.informatics, ChemDoodle.structures);
(function(informatics, io, structures, undefined) {
	'use strict';
	informatics.StructureBuilder = function() {
	};
	var _ = informatics.StructureBuilder.prototype;
	_.copy = function(molecule) {
		var json = new io.JSONInterpreter();
		return json.molFrom(json.molTo(molecule));
	};

})(ChemDoodle.informatics, ChemDoodle.io, ChemDoodle.structures);

(function(io, undefined) {
	'use strict';
	io._Interpreter = function() {
	};
	var _ = io._Interpreter.prototype;
	_.fit = function(data, length, leftAlign) {
		var size = data.length;
		var padding = [];
		for ( var i = 0; i < length - size; i++) {
			padding.push(' ');
		}
		return leftAlign ? data + padding.join('') : padding.join('') + data;
	};

})(ChemDoodle.io);

(function(c, extensions, io, structures, d3, m, m4, v3, undefined) {
	'use strict';
	var whitespaceRegex = /\s+/g;
	var whitespaceAndParenthesisRegex = /\(|\)|\s+/g;
	var whitespaceAndQuoteRegex = /\'|\s+/g;
	var whitespaceAndQuoteAndCommaRegex = /,|\'|\s+/g;
	var leadingWhitespaceRegex = /^\s+/;
	var digitsRegex = /[0-9]/g;
	var digitsSymbolRegex = /[0-9]|\+|\-/g;

	var filter = function(s) {
		return s.length !== 0;
	};

	var hallTranslations = {
		'P' : [],
		'A' : [ [ 0, .5, .5 ] ],
		'B' : [ [ .5, 0, .5 ] ],
		'C' : [ [ .5, .5, 0 ] ],
		'I' : [ [ .5, .5, .5 ] ],
		'R' : [ [ 2 / 3, 1 / 3, 1 / 3 ], [ 1 / 3, 2 / 3, 2 / 3 ] ],
		'S' : [ [ 1 / 3, 1 / 3, 2 / 3 ], [ 2 / 3, 2 / 3, 1 / 3 ] ],
		'T' : [ [ 1 / 3, 2 / 3, 1 / 3 ], [ 2 / 3, 1 / 3, 2 / 3 ] ],
		'F' : [ [ 0, .5, .5 ], [ .5, 0, .5 ], [ .5, .5, 0 ] ]
	};

	var parseTransform = function(s) {
		var displacement = 0;
		var x = 0, y = 0, z = 0;
		var indexx = s.indexOf('x');
		var indexy = s.indexOf('y');
		var indexz = s.indexOf('z');
		if (indexx !== -1) {
			x++;
			if (indexx > 0 && s.charAt(indexx - 1) !== '+') {
				x *= -1;
			}
		}
		if (indexy !== -1) {
			y++;
			if (indexy > 0 && s.charAt(indexy - 1) !== '+') {
				y *= -1;
			}
		}
		if (indexz !== -1) {
			z++;
			if (indexz > 0 && s.charAt(indexz - 1) !== '+') {
				z *= -1;
			}
		}
		if (s.length > 2) {
			var op = '+';
			for ( var i = 0, ii = s.length; i < ii; i++) {
				var l = s.charAt(i);
				if ((l === '-' || l === '/') && (i === s.length - 1 || s.charAt(i + 1).match(digitsRegex))) {
					op = l;
				}
				if (l.match(digitsRegex)) {
					if (op === '+') {
						displacement += parseInt(l);
					} else if (op === '-') {
						displacement -= parseInt(l);
					} else if (op === '/') {
						displacement /= parseInt(l);
					}
				}
			}
		}
		return [ displacement, x, y, z ];
	};

	var generateABC2XYZ = function(a, b, c, alpha, beta, gamma) {
		var d = (m.cos(alpha) - m.cos(gamma) * m.cos(beta)) / m.sin(gamma);
		return [ a, 0, 0, 0, b * m.cos(gamma), b * m.sin(gamma), 0, 0, c * m.cos(beta), c * d, c * m.sqrt(1 - m.pow(m.cos(beta), 2) - d * d), 0, 0, 0, 0, 1 ];
	};

	io.CIFInterpreter = function() {
	};
	var _ = io.CIFInterpreter.prototype = new io._Interpreter();
	_.read = function(content, xSuper, ySuper, zSuper) {
		xSuper = xSuper ? xSuper : 1;
		ySuper = ySuper ? ySuper : 1;
		zSuper = zSuper ? zSuper : 1;
		var molecule = new structures.Molecule();
		if (!content) {
			return molecule;
		}
		var lines = content.split('\n');
		var aLength = 0, bLength = 0, cLength = 0, alphaAngle = 0, betaAngle = 0, gammaAngle = 0;
		var hallClass = 'P';
		var transformLoop;
		var atomLoop;
		var bondLoop;

		var line;
		var shift = true;
		while (lines.length > 0) {
			if (shift) {
				line = lines.shift();
			} else {
				shift = true;
			}
			if (line.length > 0) {
				if (extensions.stringStartsWith(line, '_cell_length_a')) {
					aLength = parseFloat(line.split(whitespaceAndParenthesisRegex)[1]);
				} else if (extensions.stringStartsWith(line, '_cell_length_b')) {
					bLength = parseFloat(line.split(whitespaceAndParenthesisRegex)[1]);
				} else if (extensions.stringStartsWith(line, '_cell_length_c')) {
					cLength = parseFloat(line.split(whitespaceAndParenthesisRegex)[1]);
				} else if (extensions.stringStartsWith(line, '_cell_angle_alpha')) {
					alphaAngle = m.PI * parseFloat(line.split(whitespaceAndParenthesisRegex)[1]) / 180;
				} else if (extensions.stringStartsWith(line, '_cell_angle_beta')) {
					betaAngle = m.PI * parseFloat(line.split(whitespaceAndParenthesisRegex)[1]) / 180;
				} else if (extensions.stringStartsWith(line, '_cell_angle_gamma')) {
					gammaAngle = m.PI * parseFloat(line.split(whitespaceAndParenthesisRegex)[1]) / 180;
				} else if (extensions.stringStartsWith(line, '_symmetry_space_group_name_H-M')) {
					hallClass = line.split(whitespaceAndQuoteRegex)[1];
				} else if (extensions.stringStartsWith(line, 'loop_')) {
					var loop = {
						fields : [],
						lines : []
					};
					var pushingLines = false;
					// keep undefined check here because the line may be an
					// empty string
					while ((line = lines.shift()) !== undefined && !extensions.stringStartsWith(line = line.replace(leadingWhitespaceRegex, ''), 'loop_') && line.length > 0) {
						// remove leading whitespace that may appear in
						// subloop lines ^
						if (extensions.stringStartsWith(line, '_')) {
							if (pushingLines) {
								break;
							}
							loop.fields = loop.fields.concat(line.split(whitespaceRegex).filter(filter));
						} else {
							pushingLines = true;
							loop.lines.push(line);
						}
					}
					if (lines.length !== 0 && (extensions.stringStartsWith(line, 'loop_') || extensions.stringStartsWith(line, '_'))) {
						shift = false;
					}
					if (loop.fields.indexOf('_symmetry_equiv_pos_as_xyz') !== -1 || loop.fields.indexOf('_space_group_symop_operation_xyz') !== -1) {
						transformLoop = loop;
					} else if (loop.fields.indexOf('_atom_site_label') !== -1) {
						atomLoop = loop;
					} else if (loop.fields.indexOf('_geom_bond_atom_site_label_1') !== -1) {
						bondLoop = loop;
					}
				}
			}
		}
		var abc2xyz = generateABC2XYZ(aLength, bLength, cLength, alphaAngle, betaAngle, gammaAngle);
		// internal atom coordinates
		if (atomLoop) {
			var labelIndex = -1, altLabelIndex = -1, xIndex = -1, yIndex = -1, zIndex = -1;
			for ( var i = 0, ii = atomLoop.fields.length; i < ii; i++) {
				var field = atomLoop.fields[i];
				if (field === '_atom_site_type_symbol') {
					labelIndex = i;
				} else if (field === '_atom_site_label') {
					altLabelIndex = i;
				} else if (field === '_atom_site_fract_x') {
					xIndex = i;
				} else if (field === '_atom_site_fract_y') {
					yIndex = i;
				} else if (field === '_atom_site_fract_z') {
					zIndex = i;
				}
			}
			for ( var i = 0, ii = atomLoop.lines.length; i < ii; i++) {
				line = atomLoop.lines[i];
				var tokens = line.split(whitespaceRegex).filter(filter);
				var a = new structures.Atom(tokens[labelIndex === -1 ? altLabelIndex : labelIndex].split(digitsSymbolRegex)[0], parseFloat(tokens[xIndex]), parseFloat(tokens[yIndex]), parseFloat(tokens[zIndex]));
				molecule.atoms.push(a);
				if (altLabelIndex !== -1) {
					a.cifId = tokens[altLabelIndex];
					a.cifPart = 0;
				}
			}
		}
		// transforms, unless bonds are specified
		if (transformLoop && !bondLoop) {
			// assume the index is 0, just incase a different identifier is
			// used
			var symIndex = 0;
			for ( var i = 0, ii = transformLoop.fields.length; i < ii; i++) {
				var field = transformLoop.fields[i];
				if (field === '_symmetry_equiv_pos_as_xyz' || field === '_space_group_symop_operation_xyz') {
					symIndex = i;
				}
			}
			var impliedTranslations = hallTranslations[hallClass];
			var add = [];
			for ( var i = 0, ii = transformLoop.lines.length; i < ii; i++) {
				var parts = transformLoop.lines[i].split(whitespaceAndQuoteAndCommaRegex).filter(filter);
				var multx = parseTransform(parts[symIndex]);
				var multy = parseTransform(parts[symIndex + 1]);
				var multz = parseTransform(parts[symIndex + 2]);
				for ( var j = 0, jj = molecule.atoms.length; j < jj; j++) {
					var a = molecule.atoms[j];
					var x = a.x * multx[1] + a.y * multx[2] + a.z * multx[3] + multx[0];
					var y = a.x * multy[1] + a.y * multy[2] + a.z * multy[3] + multy[0];
					var z = a.x * multz[1] + a.y * multz[2] + a.z * multz[3] + multz[0];
					var copy1 = new structures.Atom(a.label, x, y, z);
					add.push(copy1);
					// cifID could be 0, so check for undefined
					if (a.cifId !== undefined) {
						copy1.cifId = a.cifId;
						copy1.cifPart = i + 1;
					}
					if (impliedTranslations) {
						for ( var k = 0, kk = impliedTranslations.length; k < kk; k++) {
							var trans = impliedTranslations[k];
							var copy2 = new structures.Atom(a.label, x + trans[0], y + trans[1], z + trans[2]);
							add.push(copy2);
							// cifID could be 0, so check for undefined
							if (a.cifId !== undefined) {
								copy2.cifId = a.cifId;
								copy2.cifPart = i + 1;
							}
						}
					}
				}
			}
			// make sure all atoms are within the unit cell
			for ( var i = 0, ii = add.length; i < ii; i++) {
				var a = add[i];
				while (a.x >= 1) {
					a.x--;
				}
				while (a.x < 0) {
					a.x++;
				}
				while (a.y >= 1) {
					a.y--;
				}
				while (a.y < 0) {
					a.y++;
				}
				while (a.z >= 1) {
					a.z--;
				}
				while (a.z < 0) {
					a.z++;
				}
			}
			// remove overlaps
			var noOverlaps = [];
			for ( var i = 0, ii = add.length; i < ii; i++) {
				var overlap = false;
				var a = add[i];
				for ( var j = 0, jj = molecule.atoms.length; j < jj; j++) {
					if (molecule.atoms[j].distance3D(a) < .0001) {
						overlap = true;
						break;
					}
				}
				if (!overlap) {
					for ( var j = 0, jj = noOverlaps.length; j < jj; j++) {
						if (noOverlaps[j].distance3D(a) < .0001) {
							overlap = true;
							break;
						}
					}
					if (!overlap) {
						noOverlaps.push(a);
					}
				}
			}
			// concat arrays
			molecule.atoms = molecule.atoms.concat(noOverlaps);
		}
		// build super cell
		var extras = [];
		for ( var i = 0; i < xSuper; i++) {
			for ( var j = 0; j < ySuper; j++) {
				for ( var k = 0; k < zSuper; k++) {
					if (!(i === 0 && j === 0 && k === 0)) {
						for ( var l = 0, ll = molecule.atoms.length; l < ll; l++) {
							var a = molecule.atoms[l];
							var copy = new structures.Atom(a.label, a.x + i, a.y + j, a.z + k);
							extras.push(copy);
							// cifID could be 0, so check for undefined
							if (a.cifId !== undefined) {
								copy.cifId = a.cifId;
								copy.cifPart = a.cifPart + (transformLoop ? transformLoop.lines.length : 0) + i + j * 10 + k * 100;
							}
						}
					}
				}
			}
		}
		molecule.atoms = molecule.atoms.concat(extras);
		// convert to xyz
		for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
			var a = molecule.atoms[i];
			var xyz = m4.multiplyVec3(abc2xyz, [ a.x, a.y, a.z ]);
			a.x = xyz[0];
			a.y = xyz[1];
			a.z = xyz[2];
		}
		// handle bonds
		if (bondLoop) {
			var atom1 = -1, atom2 = -1;
			for ( var i = 0, ii = bondLoop.fields.length; i < ii; i++) {
				var field = bondLoop.fields[i];
				if (field === '_geom_bond_atom_site_label_1') {
					atom1 = i;
				} else if (field === '_geom_bond_atom_site_label_2') {
					atom2 = i;
				}
			}
			for ( var k = 0, kk = bondLoop.lines.length; k < kk; k++) {
				var tokens = bondLoop.lines[k].split(whitespaceRegex).filter(filter);
				var id1 = tokens[atom1];
				var id2 = tokens[atom2];
				for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
					for ( var j = i + 1; j < ii; j++) {
						var ai = molecule.atoms[i];
						var aj = molecule.atoms[j];
						if (ai.cifPart !== aj.cifPart) {
							break;
						}
						if (ai.cifId === id1 && aj.cifId === id2 || ai.cifId === id2 && aj.cifId === id1) {
							molecule.bonds.push(new structures.Bond(ai, aj));
						}
					}
				}
			}
		} else {
			new c.informatics.BondDeducer().deduceCovalentBonds(molecule, 1);
		}
		// generate unit cell
		var o = [ -xSuper / 2, -ySuper / 2, -zSuper / 2 ];
		var unitCellVectors = {
			o : m4.multiplyVec3(abc2xyz, o, []),
			x : m4.multiplyVec3(abc2xyz, [ o[0] + 1, o[1], o[2] ]),
			y : m4.multiplyVec3(abc2xyz, [ o[0], o[1] + 1, o[2] ]),
			z : m4.multiplyVec3(abc2xyz, [ o[0], o[1], o[2] + 1 ]),
			xy : m4.multiplyVec3(abc2xyz, [ o[0] + 1, o[1] + 1, o[2] ]),
			xz : m4.multiplyVec3(abc2xyz, [ o[0] + 1, o[1], o[2] + 1 ]),
			yz : m4.multiplyVec3(abc2xyz, [ o[0], o[1] + 1, o[2] + 1 ]),
			xyz : m4.multiplyVec3(abc2xyz, [ o[0] + 1, o[1] + 1, o[2] + 1 ])
		};
		return {molecule:molecule, unitCell: new d3.UnitCell(unitCellVectors)};
	};

	// shortcuts
	var interpreter = new io.CIFInterpreter();
	c.readCIF = function(content, xSuper, ySuper, zSuper) {
		return interpreter.read(content, xSuper, ySuper, zSuper);
	};

})(ChemDoodle, ChemDoodle.extensions, ChemDoodle.io, ChemDoodle.structures, ChemDoodle.structures.d3, Math, ChemDoodle.lib.mat4, ChemDoodle.lib.vec3);
(function(c, io, structures, q, undefined) {
	'use strict';
	io.CMLInterpreter = function() {
	};
	var _ = io.CMLInterpreter.prototype = new io._Interpreter();
	_.read = function(content) {
		var molecules = [];
		var xml = q.parseXML(content);
		// Possible for multiple CML tags to exist
		var allCml = q(xml).find('cml');
		for (var i = 0, ii = allCml.length; i < ii; i++){
			var allMolecules = q(allCml[i]).find('molecule');
			for (var j = 0, jj = allMolecules.length; j < jj; j++) {
				var currentMolecule = molecules[j] = new structures.Molecule();
				var idmap = [];
				// Don't even bother with atomArrays, there's no point.
				var cmlAtoms = q(allMolecules[j]).find('atom');
				for (var k = 0, kk = cmlAtoms.length; k < kk; k++) {
					var currentCMLAtom = q(cmlAtoms[k]);
					var label = currentCMLAtom.attr('elementType');
					var x, y, z, currentAtom;
					if (currentCMLAtom.attr('x2') == undefined) {
						x = currentCMLAtom.attr('x3');
						y = currentCMLAtom.attr('y3');
						z = currentCMLAtom.attr('z3');
					} else {
						x = currentCMLAtom.attr('x2');
						y = currentCMLAtom.attr('y2');
						z = 0;
					}
					currentAtom = molecules[j].atoms[k] = new structures.Atom(label, x, y, z);
					idmap[k] = currentCMLAtom.attr('id');
					// charge
					if (currentCMLAtom.attr('formalCharge') != undefined) {
						currentAtom.charge = currentCMLAtom.attr('formalCharge');
					}

				}
				var cmlBonds = q(allMolecules[j]).find('bond');
				for (var k = 0, kk = cmlBonds.length; k < kk; k++) {
					var currentCMLBond = q(cmlBonds[k]);
					var atomRefs2 = currentCMLBond.attr('atomRefs2').split(' ');
					var a1, a2, order;
					a1 = currentMolecule.atoms[q.inArray(atomRefs2[0], idmap)];
					a2 = currentMolecule.atoms[q.inArray(atomRefs2[1], idmap)];
					switch(currentCMLBond.attr('order')) {
					case '2':
					case 'D':
						order = 2;
						break;
					case '3':
					case 'T':
						order = 3;
						break;
					case 'A':
						order = 1.5;
						break;
					default:
						order = 1;	 
					}
					var currentBond = molecules[j].bonds[k] = new structures.Bond(a1, a2, order);
					// check stereo... only support W or H
					switch (currentCMLBond.find('bondStereo').text()) {
					case 'W':
						currentBond.stereo = structures.Bond.STEREO_PROTRUDING;
						break;
					case 'H':
						currentBond.stereo = structures.Bond.STEREO_RECESSED;
						break;
					}
				}
			}
		}
		return molecules;
	};
	_.write = function(molecules) {
		var sb = [];
		sb.push('<?xml version="1.0" encoding="UTF-8"?>\n');
		sb.push('<cml convention="conventions:molecular" xmlns="http://www.xml-cml.org/schema" xmlns:conventions="http://www.xml-cml.org/convention/" xmlns:dc="http://purl.org/dc/elements/1.1/">\n');
		// TODO: Metadata
		for (var i = 0, ii = molecules.length; i < ii; i++) {
			sb.push('<molecule id="m'); 
			sb.push(i); 
			sb.push('">');
			sb.push('<atomArray>');
			for (var j = 0, jj = molecules[i].atoms.length; j < jj; j++) {
				var currentAtom = molecules[i].atoms[j];
				sb.push('<atom elementType="'); 
				sb.push(currentAtom.label); 
				sb.push('" id="a');
				sb.push(j); 
				sb.push('" ');
				// Always do 3D coordinates, unless there is a fancy reliable way to tell if the molecule is 2D.
				sb.push('x3="');
				sb.push(currentAtom.x);
				sb.push('" y3="');
				sb.push(currentAtom.y);
				sb.push('" z3="');
				sb.push(currentAtom.z);
				sb.push('" ');
				if (currentAtom.charge != 0) {
					sb.push('formalCharge="');
					sb.push(currentAtom.charge);
					sb.push('" ');
				}
				sb.push('/>');
			}
			sb.push('</atomArray>');
			sb.push('<bondArray>');
			for (var j = 0, jj = molecules[i].bonds.length; j < jj; j++) {
				var currentBond = molecules[i].bonds[j];
				sb.push('<bond atomRefs2="a');
				sb.push(molecules[i].atoms.indexOf(currentBond.a1));
				sb.push(' a');
				sb.push(molecules[i].atoms.indexOf(currentBond.a2));
				sb.push('" order="');
				switch(currentBond.bondOrder) {
				case 1.5:
					sb.push('A');
					break;
				case 1:
				case 2:
				case 3:
					sb.push(currentBond.bondOrder);
					break;
				case 0.5:
				default:
					sb.push('S');
				break;
				}
				sb.push('"/>');
			}
			sb.push('</bondArray>');
			sb.push('</molecule>');
		}
		sb.push('</cml>');
		return sb.join('');
	};

	// shortcuts
	var interpreter = new io.CMLInterpreter();
	c.readCML = function(content) {
		return interpreter.read(content);
	};
	c.writeCML = function(molecules) {
		return interpreter.write(molecules);
	};
	
})(ChemDoodle, ChemDoodle.io, ChemDoodle.structures, ChemDoodle.lib.jQuery);

(function(c, ELEMENT, io, structures, undefined) {
	'use strict';
	io.MOLInterpreter = function() {
	};
	var _ = io.MOLInterpreter.prototype = new io._Interpreter();
	_.read = function(content, multiplier) {
		if (!multiplier) {
			multiplier = c.default_bondLength_2D;
		}
		var molecule = new structures.Molecule();
		if (!content) {
			return molecule;
		}
		var currentTagTokens = content.split('\n');

		var counts = currentTagTokens[3];
		var numAtoms = parseInt(counts.substring(0, 3));
		var numBonds = parseInt(counts.substring(3, 6));

		for ( var i = 0; i < numAtoms; i++) {
			var line = currentTagTokens[4 + i];
			molecule.atoms[i] = new structures.Atom(line.substring(31, 34), parseFloat(line.substring(0, 10)) * multiplier, (multiplier === 1 ? 1 : -1) * parseFloat(line.substring(10, 20)) * multiplier, parseFloat(line.substring(20, 30)) * multiplier);
			var massDif = parseInt(line.substring(34, 36));
			if (massDif !== 0 && ELEMENT[molecule.atoms[i].label]) {
				molecule.atoms[i].mass = ELEMENT[molecule.atoms[i].label].mass + massDif;
			}
			switch (parseInt(line.substring(36, 39))) {
			case 1:
				molecule.atoms[i].charge = 3;
				break;
			case 2:
				molecule.atoms[i].charge = 2;
				break;
			case 3:
				molecule.atoms[i].charge = 1;
				break;
			case 5:
				molecule.atoms[i].charge = -1;
				break;
			case 6:
				molecule.atoms[i].charge = -2;
				break;
			case 7:
				molecule.atoms[i].charge = -3;
				break;
			}
		}
		for ( var i = 0; i < numBonds; i++) {
			var line = currentTagTokens[4 + numAtoms + i];
			var bondOrder = parseInt(line.substring(6, 9));
			var stereo = parseInt(line.substring(9, 12));
			if (bondOrder > 3) {
				switch (bondOrder) {
				case 4:
					bondOrder = 1.5;
					break;
				default:
					bondOrder = 1;
					break;
				}
			}
			var b = new structures.Bond(molecule.atoms[parseInt(line.substring(0, 3)) - 1], molecule.atoms[parseInt(line.substring(3, 6)) - 1], bondOrder);
			switch (stereo) {
			case 3:
				b.stereo = structures.Bond.STEREO_AMBIGUOUS;
				break;
			case 1:
				b.stereo = structures.Bond.STEREO_PROTRUDING;
				break;
			case 6:
				b.stereo = structures.Bond.STEREO_RECESSED;
				break;
			}
			molecule.bonds[i] = b;
		}
		return molecule;
	};
	_.write = function(molecule) {
		var sb = [];
		sb.push('Molecule from ChemDoodle Web Components\n\nhttp://www.ichemlabs.com\n');
		sb.push(this.fit(molecule.atoms.length.toString(), 3));
		sb.push(this.fit(molecule.bonds.length.toString(), 3));
		sb.push('  0  0  0  0            999 V2000\n');
		var p = molecule.getCenter();
		for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
			var a = molecule.atoms[i];
			var mass = ' 0';
			if (a.mass !== -1 && ELEMENT[a.label]) {
				var dif = a.mass - ELEMENT[a.label].mass;
				if (dif < 5 && dif > -4) {
					mass = (dif > -1 ? ' ' : '') + dif;
				}
			}
			var charge = '  0';
			if (a.charge !== 0) {
				switch (a.charge) {
				case 3:
					charge = '  1';
					break;
				case 2:
					charge = '  2';
					break;
				case 1:
					charge = '  3';
					break;
				case -1:
					charge = '  5';
					break;
				case -2:
					charge = '  6';
					break;
				case -3:
					charge = '  7';
					break;
				}
			}
			sb.push(this.fit(((a.x - p.x) / c.default_bondLength_2D).toFixed(4), 10));
			sb.push(this.fit((-(a.y - p.y) / c.default_bondLength_2D).toFixed(4), 10));
			sb.push(this.fit((a.z / c.default_bondLength_2D).toFixed(4), 10));
			sb.push(' ');
			sb.push(this.fit(a.label, 3, true));
			sb.push(mass);
			sb.push(charge);
			sb.push('  0  0  0  0\n');
		}
		for ( var i = 0, ii = molecule.bonds.length; i < ii; i++) {
			var b = molecule.bonds[i];
			var stereo = 0;
			if (b.stereo === structures.Bond.STEREO_AMBIGUOUS) {
				stereo = 3;
			} else if (b.stereo === structures.Bond.STEREO_PROTRUDING) {
				stereo = 1;
			} else if (b.stereo === structures.Bond.STEREO_RECESSED) {
				stereo = 6;
			}
			sb.push(this.fit((molecule.atoms.indexOf(b.a1) + 1).toString(), 3));
			sb.push(this.fit((molecule.atoms.indexOf(b.a2) + 1).toString(), 3));
			var btype = b.bondOrder;
			if(btype==1.5){
				btype = 4;
			}else if(btype>3 || btype%1!=0){
				btype = 1;
			}
			sb.push(this.fit(btype.toString(), 3));
			sb.push('  ');
			sb.push(stereo);
			sb.push('  0  0  0\n');
		}
		sb.push('M  END');
		return sb.join('');
	};

	// shortcuts
	var interpreter = new io.MOLInterpreter();
	c.readMOL = function(content, multiplier) {
		return interpreter.read(content, multiplier);
	};
	c.writeMOL = function(mol) {
		return interpreter.write(mol);
	};

})(ChemDoodle, ChemDoodle.ELEMENT, ChemDoodle.io, ChemDoodle.structures);

(function(c, extensions, io, structures, ELEMENT, trim, m, undefined) {
	'use strict';
	function checkContained(residue, set, chainID, index, helix) {
		for ( var j = 0, jj = set.length; j < jj; j++) {
			var check = set[j];
			if (check.id === chainID && index >= check.start && index <= check.end) {
				if (helix) {
					residue.helix = true;
				} else {
					residue.sheet = true;
				}
				if (index === check.end) {
					residue.arrow = true;
				}
				return;
			}
		}
	}
	
	io.PDBInterpreter = function() {
	};
	var _ = io.PDBInterpreter.prototype = new io._Interpreter();
	_.calculateRibbonDistances = false;
	_.deduceResidueBonds = false;
	_.read = function(content, multiplier) {
		var molecule = new structures.Molecule();
		molecule.chains = [];
		if (!content) {
			return molecule;
		}
		var currentTagTokens = content.split('\n');
		if (!multiplier) {
			multiplier = 1;
		}
		var helices = [];
		var sheets = [];
		var lastC;
		var currentChain = [];
		var resatoms = [];
		var atomSerials = [];
		for ( var i = 0, ii = currentTagTokens.length; i < ii; i++) {
			var line = currentTagTokens[i];
			if (extensions.stringStartsWith(line, 'HELIX')) {
				helices.push({
					id : line.substring(19, 20),
					start : parseInt(line.substring(21, 25)),
					end : parseInt(line.substring(33, 37))
				});
			} else if (extensions.stringStartsWith(line, 'SHEET')) {
				sheets.push({
					id : line.substring(21, 22),
					start : parseInt(line.substring(22, 26)),
					end : parseInt(line.substring(33, 37))
				});
			} else if (extensions.stringStartsWith(line, 'ATOM')) {
				var altLoc = line.substring(16, 17);
				if (altLoc === ' ' || altLoc === 'A') {
					var label = trim(line.substring(76, 78));
					if (label.length === 0) {
						var s = trim(line.substring(12, 14));
						if (s === 'HD') {
							label = 'H';
						} else if (s.length > 0) {
							if (s.length > 1) {
								label = s.charAt(0) + s.substring(1).toLowerCase();
							} else {
								label = s;
							}
						}
					}
					var a = new structures.Atom(label, parseFloat(line.substring(30, 38)) * multiplier, parseFloat(line.substring(38, 46)) * multiplier, parseFloat(line.substring(46, 54)) * multiplier);
					a.hetatm = false;
					resatoms.push(a);
					// set up residue
					var resSeq = parseInt(line.substring(22, 26));
					if (currentChain.length === 0) {
						for ( var j = 0; j < 3; j++) {
							var dummyFront = new structures.Residue(-1);
							dummyFront.cp1 = a;
							dummyFront.cp2 = a;
							currentChain.push(dummyFront);
						}
					}
					if (resSeq !== Number.NaN && currentChain[currentChain.length - 1].resSeq !== resSeq) {
						var r = new structures.Residue(resSeq);
						r.name = trim(line.substring(17, 20));
						if (r.name.length === 3) {
							r.name = r.name.substring(0, 1) + r.name.substring(1).toLowerCase();
						} else {
							if (r.name.length === 2 && r.name.charAt(0) === 'D') {
								r.name = r.name.substring(1);
							}
						}
						currentChain.push(r);
						var chainID = line.substring(21, 22);
						checkContained(r, helices, chainID, resSeq, true);
						checkContained(r, sheets, chainID, resSeq, false);
					}
					// end residue setup
					var atomName = trim(line.substring(12, 16));
					var currentResidue = currentChain[currentChain.length - 1];
					if (atomName === 'CA' || atomName === 'P' || atomName === 'O5\'') {
						if (!currentResidue.cp1) {
							currentResidue.cp1 = a;
						}
					} else if (atomName === 'N3' && (currentResidue.name === 'C' || currentResidue.name === 'U' || currentResidue.name === 'T') || atomName === 'N1' && (currentResidue.name === 'A' || currentResidue.name === 'G')) {
						// control points for base platform direction
						currentResidue.cp3 = a;
					} else if (atomName === 'C2') {
						// control points for base platform orientation
						currentResidue.cp4 = a;
					} else if (atomName === 'C4' && (currentResidue.name === 'C' || currentResidue.name === 'U' || currentResidue.name === 'T') || atomName === 'C6' && (currentResidue.name === 'A' || currentResidue.name === 'G')) {
						// control points for base platform orientation
						currentResidue.cp5 = a;
					} else if (atomName === 'O' || atomName === 'C6' && (currentResidue.name === 'C' || currentResidue.name === 'U' || currentResidue.name === 'T') || atomName === 'N9') {
						if (!currentChain[currentChain.length - 1].cp2) {
							if (atomName === 'C6' || atomName === 'N9') {
								lastC = a;
							}
							currentResidue.cp2 = a;
						}
					} else if (atomName === 'C') {
						lastC = a;
					}
				}
			} else if (extensions.stringStartsWith(line, 'HETATM')) {
				var symbol = trim(line.substring(76, 78));
				if (symbol.length === 0) {
					// handle the case where an improperly formatted PDB
					// file states the element label in the atom name column
					symbol = trim(line.substring(12, 16));
				}
				if (symbol.length > 1) {
					symbol = symbol.substring(0, 1) + symbol.substring(1).toLowerCase();
				}
				var het = new structures.Atom(symbol, parseFloat(line.substring(30, 38)) * multiplier, parseFloat(line.substring(38, 46)) * multiplier, parseFloat(line.substring(46, 54)) * multiplier);
				het.hetatm = true;
				var residueName = trim(line.substring(17, 20));
				if (residueName === 'HOH') {
					het.isWater = true;
				}
				molecule.atoms.push(het);
				atomSerials[parseInt(trim(line.substring(6, 11)))] = het;
			} else if (extensions.stringStartsWith(line, 'CONECT')) {
				var oid = parseInt(trim(line.substring(6, 11)));
				if (atomSerials[oid]) {
					var origin = atomSerials[oid];
					for ( var k = 0; k < 4; k++) {
						var next = trim(line.substring(11 + k * 5, 16 + k * 5));
						if (next.length !== 0) {
							var nid = parseInt(next);
							if (atomSerials[nid]) {
								var a2 = atomSerials[nid];
								var found = false;
								for ( var j = 0, jj = molecule.bonds.length; j < jj; j++) {
									var b = molecule.bonds[j];
									if (b.a1 === origin && b.a2 === a2 || b.a1 === a2 && b.a2 === origin) {
										found = true;
										break;
									}
								}
								if (!found) {
									molecule.bonds.push(new structures.Bond(origin, a2));
								}
							}
						}
					}
				}
			} else if (extensions.stringStartsWith(line, 'TER')) {
				this.endChain(molecule, currentChain, lastC, resatoms);
				currentChain = [];
			} else if (extensions.stringStartsWith(line, 'ENDMDL')) {
				break;
			}
		}
		this.endChain(molecule, currentChain, lastC, resatoms);
		if (molecule.bonds.size === 0) {
			new c.informatics.BondDeducer().deduceCovalentBonds(molecule, multiplier);
		}
		if (this.deduceResidueBonds) {
			for ( var i = 0, ii = resatoms.length; i < ii; i++) {
				var max = m.min(ii, i + 20);
				for ( var j = i + 1; j < max; j++) {
					var first = resatoms[i];
					var second = resatoms[j];
					if (first.distance3D(second) < (ELEMENT[first.label].covalentRadius + ELEMENT[second.label].covalentRadius) * 1.1) {
						molecule.bonds.push(new structures.Bond(first, second, 1));
					}
				}
			}
		}
		molecule.atoms = molecule.atoms.concat(resatoms);
		if (this.calculateRibbonDistances) {
			this.calculateDistances(molecule, resatoms);
		}
		return molecule;
	};
	_.endChain = function(molecule, chain, lastC, resatoms) {
		if (chain.length > 0) {
			var last = chain[chain.length - 1];
			if (!last.cp1) {
				last.cp1 = resatoms[resatoms.length - 2];
			}
			if (!last.cp2) {
				last.cp2 = resatoms[resatoms.length - 1];
			}
			for ( var i = 0; i < 4; i++) {
				var dummyEnd = new structures.Residue(-1);
				dummyEnd.cp1 = lastC;
				dummyEnd.cp2 = chain[chain.length - 1].cp2;
				chain.push(dummyEnd);
			}
			molecule.chains.push(chain);
		}
	};
	_.calculateDistances = function(molecule, resatoms) {
		var hetatm = [];
		for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
			var a = molecule.atoms[i];
			if (a.hetatm) {
				if (!a.isWater) {
					hetatm.push(a);
				}
			}
		}
		for ( var i = 0, ii = resatoms.length; i < ii; i++) {
			var a = resatoms[i];
			a.closestDistance = Number.POSITIVE_INFINITY;
			if (hetatm.length === 0) {
				a.closestDistance = 0;
			} else {
				for ( var j = 0, jj = hetatm.length; j < jj; j++) {
					a.closestDistance = Math.min(a.closestDistance, a.distance3D(hetatm[j]));
				}
			}
		}
	};

	// shortcuts
	var interpreter = new io.PDBInterpreter();
	c.readPDB = function(content, multiplier) {
		return interpreter.read(content, multiplier);
	};

})(ChemDoodle, ChemDoodle.extensions, ChemDoodle.io, ChemDoodle.structures, ChemDoodle.ELEMENT, ChemDoodle.lib.jQuery.trim, Math);

(function(c, extensions, io, structures, q, undefined) {
	'use strict';
	var SQZ_HASH = {
		'@' : 0,
		'A' : 1,
		'B' : 2,
		'C' : 3,
		'D' : 4,
		'E' : 5,
		'F' : 6,
		'G' : 7,
		'H' : 8,
		'I' : 9,
		'a' : -1,
		'b' : -2,
		'c' : -3,
		'd' : -4,
		'e' : -5,
		'f' : -6,
		'g' : -7,
		'h' : -8,
		'i' : -9
	}, DIF_HASH = {
		'%' : 0,
		'J' : 1,
		'K' : 2,
		'L' : 3,
		'M' : 4,
		'N' : 5,
		'O' : 6,
		'P' : 7,
		'Q' : 8,
		'R' : 9,
		'j' : -1,
		'k' : -2,
		'l' : -3,
		'm' : -4,
		'n' : -5,
		'o' : -6,
		'p' : -7,
		'q' : -8,
		'r' : -9
	}, DUP_HASH = {
		'S' : 1,
		'T' : 2,
		'U' : 3,
		'V' : 4,
		'W' : 5,
		'X' : 6,
		'Y' : 7,
		'Z' : 8,
		's' : 9
	};

	io.JCAMPInterpreter = function() {
	};
	var _ = io.JCAMPInterpreter.prototype = new io._Interpreter();
	_.convertHZ2PPM = false;
	_.read = function(content) {
		this.isBreak = function(c) {
			// some of these arrays may return zero, so check if undefined
			return SQZ_HASH[c] !== undefined || DIF_HASH[c] !== undefined || DUP_HASH[c] !== undefined || c === ' ' || c === '-' || c === '+';
		};
		this.getValue = function(decipher, lastDif) {
			var first = decipher.charAt(0);
			var rest = decipher.substring(1);
			// some of these arrays may return zero, so check if undefined
			if (SQZ_HASH[first] !== undefined) {
				return parseFloat(SQZ_HASH[first] + rest);
			} else if (DIF_HASH[first] !== undefined) {
				return parseFloat(DIF_HASH[first] + rest) + lastDif;
			}
			return parseFloat(rest);
		};
		var spectrum = new structures.Spectrum();
		if (content === undefined || content.length === 0) {
			return spectrum;
		}
		var lines = content.split('\n');
		var sb = [];
		var xLast, xFirst, yFirst, nPoints, xFactor = 1, yFactor = 1, observeFrequency = 1, deltaX = -1, shiftOffsetNum = -1, shiftOffsetVal = -1;
		var recordMeta = true, divideByFrequency = false;
		for ( var i = 0, ii = lines.length; i < ii; i++) {
			var use = lines[i].trim();
			var index = use.indexOf('$$');
			if (index !== -1) {
				use = use.substring(0, index);
			}
			if (sb.length === 0 || !extensions.stringStartsWith(lines[i], '##')) {
				var trimmed = use.trim();
				if (sb.length !== 0 && trimmed.length!==0) {
					sb.push('\n');
				}
				sb.push(trimmed);
			} else {
				var currentRecord = sb.join('');
				if (recordMeta && currentRecord.length < 100) {
					spectrum.metadata.push(currentRecord);
				}
				sb = [ use ];
				if (extensions.stringStartsWith(currentRecord, '##TITLE=')) {
					spectrum.title = currentRecord.substring(8).trim();
				} else if (extensions.stringStartsWith(currentRecord, '##XUNITS=')) {
					spectrum.xUnit = currentRecord.substring(9).trim();
					if (this.convertHZ2PPM && spectrum.xUnit.toUpperCase() === 'HZ') {
						spectrum.xUnit = 'PPM';
						divideByFrequency = true;
					}
				} else if (extensions.stringStartsWith(currentRecord, '##YUNITS=')) {
					spectrum.yUnit = currentRecord.substring(9).trim();
				} else if (extensions.stringStartsWith(currentRecord, '##XYPAIRS=')) {
					// spectrum.yUnit = currentRecord.substring(9).trim();
				} else if (extensions.stringStartsWith(currentRecord, '##FIRSTX=')) {
					xFirst = parseFloat(currentRecord.substring(9).trim());
				} else if (extensions.stringStartsWith(currentRecord, '##LASTX=')) {
					xLast = parseFloat(currentRecord.substring(8).trim());
				} else if (extensions.stringStartsWith(currentRecord, '##FIRSTY=')) {
					yFirst = parseFloat(currentRecord.substring(9).trim());
				} else if (extensions.stringStartsWith(currentRecord, '##NPOINTS=')) {
					nPoints = parseFloat(currentRecord.substring(10).trim());
				} else if (extensions.stringStartsWith(currentRecord, '##XFACTOR=')) {
					xFactor = parseFloat(currentRecord.substring(10).trim());
				} else if (extensions.stringStartsWith(currentRecord, '##YFACTOR=')) {
					yFactor = parseFloat(currentRecord.substring(10).trim());
				} else if (extensions.stringStartsWith(currentRecord, '##DELTAX=')) {
					deltaX = parseFloat(currentRecord.substring(9).trim());
				} else if (extensions.stringStartsWith(currentRecord, '##.OBSERVE FREQUENCY=')) {
					if (this.convertHZ2PPM) {
						observeFrequency = parseFloat(currentRecord.substring(21).trim());
					}
				} else if (extensions.stringStartsWith(currentRecord, '##.SHIFT REFERENCE=')) {
					if (this.convertHZ2PPM) {
						var parts = currentRecord.substring(19).split(',');
						shiftOffsetNum = parseInt(parts[2].trim());
						shiftOffsetVal = parseFloat(parts[3].trim());
					}
				} else if (extensions.stringStartsWith(currentRecord, '##XYDATA=')) {
					if (!divideByFrequency) {
						observeFrequency = 1;
					}
					recordMeta = false;
					var lastWasDif = false;
					var innerLines = currentRecord.split('\n');
					var abscissaSpacing = (xLast - xFirst) / (nPoints - 1);
					var lastX = xFirst - abscissaSpacing;
					var lastY = yFirst;
					var lastDif = 0;
					var lastOrdinate;
					for ( var j = 1, jj = innerLines.length; j < jj; j++) {
						var data = [];
						var read = innerLines[j].trim();
						var sb = [];
						for ( var k = 0, kk = read.length; k < kk; k++) {
							if (this.isBreak(read.charAt(k))) {
								if (sb.length > 0 && !(sb.length === 1 && sb[0] === ' ')) {
									data.push(sb.join(''));
								}
								sb = [ read.charAt(k) ];
							} else {
								sb.push(read.charAt(k));
							}
						}
						data.push(sb.join(''));
						lastX = parseFloat(data[0]) * xFactor - abscissaSpacing;
						for ( var k = 1, kk = data.length; k < kk; k++) {
							var decipher = data[k];
							// some of these arrays may return zero, so
							// check if undefined
							if (DUP_HASH[decipher.charAt(0)] !== undefined) {
								// be careful when reading this, to keep
								// spectra efficient, DUPS are actually
								// discarded, except the last y!
								var dup = parseInt(DUP_HASH[decipher.charAt(0)] + decipher.substring(1)) - 1;
								for ( var l = 0; l < dup; l++) {
									lastX += abscissaSpacing;
									lastDif = this.getValue(lastOrdinate, lastDif);
									lastY = lastDif * yFactor;
									count++;
									spectrum.data[spectrum.data.length - 1] = new structures.Point(lastX / observeFrequency, lastY);
								}
							} else {
								// some of these arrays may return zero, so
								// check if undefined
								if (!(SQZ_HASH[decipher.charAt(0)] !== undefined && lastWasDif)) {
									lastWasDif = DIF_HASH[decipher.charAt(0)] !== undefined;
									lastOrdinate = decipher;
									lastX += abscissaSpacing;
									lastDif = this.getValue(decipher, lastDif);
									lastY = lastDif * yFactor;
									count++;
									spectrum.data.push(new structures.Point(lastX / observeFrequency, lastY));
								} else {
									lastY = this.getValue(decipher, lastDif) * yFactor;
								}
							}
						}
					}
					if (shiftOffsetNum !== -1) {
						var dif = shiftOffsetVal - spectrum.data[shiftOffsetNum - 1].x;
						for ( var i = 0, ii = spectrum.data.length; i < ii; i++) {
							spectrum.data[i].x += dif;
						}
					}
				} else if (extensions.stringStartsWith(currentRecord, '##PEAK TABLE=')) {
					recordMeta = false;
					spectrum.continuous = false;
					var innerLines = currentRecord.split('\n');
					var count = 0;
					var reg = /[\s,]+/;
					for ( var j = 1, jj = innerLines.length; j < jj; j++) {
						var items = innerLines[j].split(reg);
						count += items.length / 2;
						for ( var k = 0, kk = items.length; k + 1 < kk; k += 2) {
							spectrum.data.push(new structures.Point(parseFloat(items[k].trim()), parseFloat(items[k + 1].trim())));
						}
					}
				} else if (extensions.stringStartsWith(currentRecord, '##ATOMLIST=')) {
					spectrum.molecule = new structures.Molecule();
					var innerLines = currentRecord.split('\n');
					var reg = /[\s]+/;
					for ( var j = 1, jj = innerLines.length; j < jj; j++) {
						var items = innerLines[j].split(reg);
						spectrum.molecule.atoms.push(new structures.Atom(items[1]));
					}
				} else if (extensions.stringStartsWith(currentRecord, '##BONDLIST=')) {
					var innerLines = currentRecord.split('\n');
					var reg = /[\s]+/;
					for ( var j = 1, jj = innerLines.length; j < jj; j++) {
						var items = innerLines[j].split(reg);
						var order = 1;
						if(items[2]==='D'){
							order = 2;
						}else if(items[2]==='T'){
							order = 3;
						}
						spectrum.molecule.bonds.push(new structures.Bond(spectrum.molecule.atoms[parseInt(items[0])-1], spectrum.molecule.atoms[parseInt(items[1])-1], order));
					}
				} else if (spectrum.molecule && extensions.stringStartsWith(currentRecord, '##XY_RASTER=')) {
					var innerLines = currentRecord.split('\n');
					var reg = /[\s]+/;
					for ( var j = 1, jj = innerLines.length; j < jj; j++) {
						var items = innerLines[j].split(reg);
						var a = spectrum.molecule.atoms[parseInt(items[0])-1];
						a.x = parseInt(items[1]);
						a.y = parseInt(items[2]);
						if(items.length==4){
							a.z = parseInt(items[3]);
						}
					}
					spectrum.molecule.scaleToAverageBondLength(20);
				} else if (extensions.stringStartsWith(currentRecord, '##PEAK ASSIGNMENTS=')) {
					var innerLines = currentRecord.split('\n');
					var reg = /[\s,()<>]+/;
					spectrum.assignments = [];
					for ( var j = 1, jj = innerLines.length; j < jj; j++) {
						var items = innerLines[j].split(reg);
						var x = parseFloat(items[1]);
						var y = parseFloat(items[2]);
						var a = spectrum.molecule.atoms[parseInt(items[3])-1];
						var used = false;
						for(var k = 0, kk = spectrum.assignments.length; k<kk; k++){
							var assign = spectrum.assignments[k];
							if(assign.x === x){
								assign.as.push(a);
								a.assigned = assign;
								used = true;
								break;
							}
						}
						if(!used){
							var assign = {x:x, y:y, as:[a]};
							a.assigned = assign;
							spectrum.assignments.push(assign);
						}
					}
				}
			}
		}
		spectrum.setup();
		return spectrum;
	};
	_.makeStructureSpectrumSet = function(id, content) {
		this.convertHZ2PPM = true;
		var spectrum = this.read(content);
		var mcanvas = new c.ViewerCanvas(id+'_molecule', 200,200);
		mcanvas.specs.atoms_displayTerminalCarbonLabels_2D = true;
		mcanvas.specs.atoms_displayImplicitHydrogens_2D = true;
		mcanvas.mouseout = function(e){
			if(this.molecules.length!==0){
				for(var i = 0, ii = this.molecules[0].atoms.length; i<ii; i++){
					this.molecules[0].atoms[i].isHover = false;
				}
				spectrum.hovered = undefined;
				this.repaint();
				scanvas.repaint();
			}
		};
		mcanvas.touchend = mcanvas.mouseout;
		mcanvas.mousemove = function(e){
			if(this.molecules.length!==0){
				var closest=undefined;
				for(var i = 0, ii = this.molecules[0].atoms.length; i<ii; i++){
					var a = this.molecules[0].atoms[i];
					a.isHover = false;
					if(a.assigned && (closest===undefined || e.p.distance(a)<e.p.distance(closest))){
						closest = a;
					}
				}
				spectrum.hovered = undefined;
				if(e.p.distance(closest)<20){
					for(var i = 0, ii = closest.assigned.as.length; i<ii; i++){
						closest.assigned.as[i].isHover = true;
					}
					scanvas.spectrum.hovered = closest.assigned;
				}
				this.repaint();
				scanvas.repaint();
			}
		};
		mcanvas.touchmove = mcanvas.mousemove;
		mcanvas.drawChildExtras = function(ctx, specs){
			if(this.molecules.length!==0){
				for(var i = 0, ii = this.molecules[0].atoms.length; i<ii; i++){
					this.molecules[0].atoms[i].drawDecorations(ctx, specs);
				}
			}
		};
		var scanvas = new c.ObserverCanvas(id+'_spectrum', 400,200);
		scanvas.specs.plots_showYAxis = false;
		scanvas.specs.plots_flipXAxis = true;
		scanvas.mouseout = function(e){
			if(this.spectrum && this.spectrum.assignments){
				for(var i = 0, ii = mcanvas.molecules[0].atoms.length; i<ii; i++){
					mcanvas.molecules[0].atoms[i].isHover = false;
				}
				this.spectrum.hovered = undefined;
				mcanvas.repaint();
				this.repaint();
			}
		};
		scanvas.touchend = scanvas.mouseout;
		scanvas.mousemove = function(e){
			if(this.spectrum && this.spectrum.assignments){
				var closest=undefined;
				for(var i = 0, ii = mcanvas.molecules[0].atoms.length; i<ii; i++){
					mcanvas.molecules[0].atoms[i].isHover = false;
				}
				this.spectrum.hovered = undefined;
				for(var i = 0, ii = this.spectrum.assignments.length; i<ii; i++){
					var a = this.spectrum.assignments[i];
					if(closest===undefined || Math.abs(this.spectrum.getTransformedX(a.x, this.specs, this.spectrum.memory.width, this.spectrum.memory.offsetLeft)-e.p.x)<Math.abs(this.spectrum.getTransformedX(closest.x, this.specs, this.spectrum.memory.width, this.spectrum.memory.offsetLeft)-e.p.x)){
						closest = a;
					}
				}
				if(Math.abs(this.spectrum.getTransformedX(closest.x, this.specs, this.spectrum.memory.width, this.spectrum.memory.offsetLeft)-e.p.x)<20){
					for(var i = 0, ii = closest.as.length; i<ii; i++){
						closest.as[i].isHover = true;
					}
					this.spectrum.hovered = closest;
				}
				mcanvas.repaint();
				this.repaint();
			}
		};
		scanvas.touchmove = scanvas.mousemove;
		scanvas.drawChildExtras = function(ctx){
			if(this.spectrum && this.spectrum.hovered){
				var x = this.spectrum.getTransformedX(this.spectrum.hovered.x, scanvas.specs, this.spectrum.memory.width, this.spectrum.memory.offsetLeft);
				if (x >= this.spectrum.memory.offsetLeft && x < this.spectrum.memory.width) {
					ctx.save();
					ctx.strokeStyle='#885110';
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.moveTo(x, this.spectrum.memory.height - this.spectrum.memory.offsetBottom);
					ctx.lineTo(x, this.spectrum.getTransformedY(this.spectrum.hovered.y, scanvas.specs, this.spectrum.memory.height, this.spectrum.memory.offsetBottom, this.spectrum.memory.offsetTop));
					ctx.stroke();
					ctx.restore();
				}
			}
		};
		if(spectrum){
			scanvas.loadSpectrum(spectrum);
			if(spectrum.molecule){
				mcanvas.loadMolecule(spectrum.molecule);
			}
		}
		return [mcanvas, scanvas];
	};

	// shortcuts
	var interpreter = new io.JCAMPInterpreter();
	interpreter.convertHZ2PPM = true;
	c.readJCAMP = function(content) {
		return interpreter.read(content);
	};
})(ChemDoodle, ChemDoodle.extensions, ChemDoodle.io, ChemDoodle.structures, ChemDoodle.lib.jQuery);
(function(c, io, structures, d2, d3, JSON, undefined) {
	'use strict';
	io.JSONInterpreter = function() {
	};
	var _ = io.JSONInterpreter.prototype;
	_.contentTo = function(mols, shapes) {
		if(!mols){mols = [];}
		if(!shapes){shapes = [];}
		var count1 = 0, count2 = 0;
		for ( var i = 0, ii = mols.length; i < ii; i++) {
			var mol = mols[i];
			for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
				mol.atoms[j].tmpid = 'a' + count1++;
			}
			for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
				mol.bonds[j].tmpid = 'b' + count2++;
			}
		}
		count1 = 0;
		for ( var i = 0, ii = shapes.length; i < ii; i++) {
			shapes[i].tmpid = 's' + count1++;
		}
		var dummy = {};
		if (mols && mols.length > 0) {
			dummy.m = [];
			for ( var i = 0, ii = mols.length; i < ii; i++) {
				dummy.m.push(this.molTo(mols[i]));
			}
		}
		if (shapes && shapes.length > 0) {
			dummy.s = [];
			for ( var i = 0, ii = shapes.length; i < ii; i++) {
				dummy.s.push(this.shapeTo(shapes[i]));
			}
		}
		for ( var i = 0, ii = mols.length; i < ii; i++) {
			var mol = mols[i];
			for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
				mol.atoms[j].tmpid = undefined;
			}
			for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
				mol.bonds[j].tmpid = undefined;
			}
		}
		for ( var i = 0, ii = shapes.length; i < ii; i++) {
			shapes[i].tmpid = undefined;
		}
		return dummy;
	};
	_.contentFrom = function(dummy) {
		var obj = {
			molecules : [],
			shapes : []
		};
		if (dummy.m) {
			for ( var i = 0, ii = dummy.m.length; i < ii; i++) {
				obj.molecules.push(this.molFrom(dummy.m[i]));
			}
		}
		if (dummy.s) {
			for ( var i = 0, ii = dummy.s.length; i < ii; i++) {
				obj.shapes.push(this.shapeFrom(dummy.s[i], obj.molecules));
			}
		}
		for ( var i = 0, ii = obj.molecules.length; i < ii; i++) {
			var mol = obj.molecules[i];
			for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
				mol.atoms[j].tmpid = undefined;
			}
			for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
				mol.bonds[j].tmpid = undefined;
			}
		}
		for ( var i = 0, ii = obj.shapes.length; i < ii; i++) {
			obj.shapes[i].tmpid = undefined;
		}
		return obj;
	};
	_.queryTo = function(query) {
		var q = {};
		var appendProperty = function(q, p, name, isRange){
			if(p){
				q[name] = {v:isRange?query.outputRange(p.v):p.v, n:p.not};
			}
		};
		if(query.type===structures.Query.TYPE_ATOM){
			appendProperty(q, query.elements, 'as');
			appendProperty(q, query.chirality, '@');
			appendProperty(q, query.aromatic, 'A');
			appendProperty(q, query.charge, 'C', true);
			appendProperty(q, query.hydrogens, 'H', true);
			appendProperty(q, query.ringCount, 'R', true);
			appendProperty(q, query.saturation, 'S');
			appendProperty(q, query.connectivity, 'X', true);
			appendProperty(q, query.connectivityNoH, 'x', true);
		}else{
			appendProperty(q, query.orders, 'bs');
			appendProperty(q, query.stereo, '@');
			appendProperty(q, query.aromatic, 'A');
			appendProperty(q, query.ringCount, 'R', true);
		}
		return q;
	};
	_.molTo = function(mol) {
		var dummy = {
			a : []
		};
		for ( var i = 0, ii = mol.atoms.length; i < ii; i++) {
			var a = mol.atoms[i];
			var da = {
				x : a.x,
				y : a.y
			};
			if (a.tmpid) {
				da.i = a.tmpid;
			}
			if (a.label !== 'C') {
				da.l = a.label;
			}
			if (a.z !== 0) {
				da.z = a.z;
			}
			if (a.charge !== 0) {
				da.c = a.charge;
			}
			if (a.mass !== -1) {
				da.m = a.mass;
			}
			if (a.implicitH !== -1) {
				da.h = a.implicitH;
			}
			if (a.numRadical !== 0) {
				da.r = a.numRadical;
			}
			if (a.numLonePair !== 0) {
				da.p = a.numLonePair;
			}
			if (a.query) {
				da.q = this.queryTo(a.query);
			}
			dummy.a.push(da);
		}
		if (mol.bonds.length > 0) {
			dummy.b = [];
			for ( var i = 0, ii = mol.bonds.length; i < ii; i++) {
				var b = mol.bonds[i];
				var db = {
					b : mol.atoms.indexOf(b.a1),
					e : mol.atoms.indexOf(b.a2)
				};
				if (b.tmpid) {
					db.i = b.tmpid;
				}
				if (b.bondOrder !== 1) {
					db.o = b.bondOrder;
				}
				if (b.stereo !== structures.Bond.STEREO_NONE) {
					db.s = b.stereo;
				}
				if (b.query) {
					db.q = this.queryTo(b.query);
				}
				dummy.b.push(db);
			}
		}
		return dummy;
	};
	_.queryFrom = function(json) {
		var query = new structures.Query(json.as?structures.Query.TYPE_ATOM:structures.Query.TYPE_BOND);
		var setupProperty = function(query, json, name, isRange){
			if(json){
				query[name] = {};
				query[name].v = isRange?query.parseRange(json.v):json.v;
				if(json.n){
					query[name].not = true;
				}
			}
		};
		if(query.type===structures.Query.TYPE_ATOM){
			setupProperty(query, json.as, 'elements');
			setupProperty(query, json['@'], 'chirality');
			setupProperty(query, json.A, 'aromatic');
			setupProperty(query, json.C, 'charge', true);
			setupProperty(query, json.H, 'hydrogens', true);
			setupProperty(query, json.R, 'ringCount', true);
			setupProperty(query, json.S, 'saturation');
			setupProperty(query, json.X, 'connectivity', true);
			setupProperty(query, json.x, 'connectivityNoH', true);
		}else{
			setupProperty(query, json.bs, 'orders');
			setupProperty(query, json['@'], 'stereo');
			setupProperty(query, json.A, 'aromatic');
			setupProperty(query, json.R, 'ringCount', true);
		}
		return query;
	};
	_.molFrom = function(json) {
		var molecule = new structures.Molecule();
		for ( var i = 0, ii = json.a.length; i < ii; i++) {
			var c = json.a[i];
			var a = new structures.Atom(c.l ? c.l : 'C', c.x, c.y);
			if (c.i) {
				a.tmpid = c.i;
			}
			if (c.z) {
				a.z = c.z;
			}
			if (c.c) {
				a.charge = c.c;
			}
			if (c.m) {
				a.mass = c.m;
			}
			if (c.h) {
				a.implicitH = c.h;
			}
			if (c.r) {
				a.numRadical = c.r;
			}
			if (c.p) {
				a.numLonePair = c.p;
			}
			if(c.q){
				a.query = this.queryFrom(c.q);
			}
			// these are booleans or numbers, so check if undefined
			if (c.p_h !== undefined) {
				a.hetatm = c.p_h;
			}
			if (c.p_w !== undefined) {
				a.isWater = c.p_w;
			}
			if (c.p_d !== undefined) {
				a.closestDistance = c.p_d;
			}
			molecule.atoms.push(a);
		}
		if (json.b) {
			for ( var i = 0, ii = json.b.length; i < ii; i++) {
				var c = json.b[i];
				// order can be 0, so check against undefined
				var b = new structures.Bond(molecule.atoms[c.b], molecule.atoms[c.e], c.o === undefined ? 1 : c.o);
				if (c.i) {
					b.tmpid = c.i;
				}
				if (c.s) {
					b.stereo = c.s;
				}
				if(c.q){
					b.query = this.queryFrom(c.q);
				}
				molecule.bonds.push(b);
			}
		}
		return molecule;
	};
	_.shapeTo = function(shape) {
		var dummy = {};
		if (shape.tmpid) {
			dummy.i = shape.tmpid;
		}
		if (shape instanceof d2.Line) {
			dummy.t = 'Line';
			dummy.x1 = shape.p1.x;
			dummy.y1 = shape.p1.y;
			dummy.x2 = shape.p2.x;
			dummy.y2 = shape.p2.y;
			dummy.a = shape.arrowType;
		} else if (shape instanceof d2.Pusher) {
			dummy.t = 'Pusher';
			dummy.o1 = shape.o1.tmpid;
			dummy.o2 = shape.o2.tmpid;
			if (shape.numElectron !== 1) {
				dummy.e = shape.numElectron;
			}
		} else if (shape instanceof d2.AtomMapping) {
			dummy.t = 'AtomMapping';
			dummy.a1 = shape.o1.tmpid;
			dummy.a2 = shape.o2.tmpid;
		} else if (shape instanceof d2.Bracket) {
			dummy.t = 'Bracket';
			dummy.x1 = shape.p1.x;
			dummy.y1 = shape.p1.y;
			dummy.x2 = shape.p2.x;
			dummy.y2 = shape.p2.y;
			if (shape.charge !== 0) {
				dummy.c = shape.charge;
			}
			if (shape.mult !== 0) {
				dummy.m = shape.mult;
			}
			if (shape.repeat !== 0) {
				dummy.r = shape.repeat;
			}
		} else if (shape instanceof d2.DynamicBracket) {
			dummy.t = 'DynamicBracket';
			dummy.b1 = shape.b1.tmpid;
			dummy.b2 = shape.b2.tmpid;
			dummy.n1 = shape.n1;
			dummy.n2 = shape.n2;
			if(shape.flip===true){
				dummy.f = true;
			}
		} else if (shape instanceof d2.VAP) {
			dummy.t = 'VAP';
			dummy.x = shape.asterisk.x;
			dummy.y = shape.asterisk.y;
			if(shape.bondType!==1){
				dummy.o = shape.bondType;
			}
			if(shape.substituent){
				dummy.s = shape.substituent.tmpid;
			}
			dummy.a = [];
			for(var i = 0, ii=shape.attachments.length; i<ii; i++){
				dummy.a.push(shape.attachments[i].tmpid);
			}
		} else if (shape instanceof d3.Distance) {
			dummy.t = 'Distance';
			dummy.a1 = shape.a1.tmpid;
			dummy.a2 = shape.a2.tmpid;
			if (shape.node) {
				dummy.n = shape.node;
				dummy.o = shape.offset;
			}
		} else if (shape instanceof d3.Angle) {
			dummy.t = 'Angle';
			dummy.a1 = shape.a1.tmpid;
			dummy.a2 = shape.a2.tmpid;
			dummy.a3 = shape.a3.tmpid;
		} else if (shape instanceof d3.Torsion) {
			dummy.t = 'Torsion';
			dummy.a1 = shape.a1.tmpid;
			dummy.a2 = shape.a2.tmpid;
			dummy.a3 = shape.a3.tmpid;
			dummy.a4 = shape.a4.tmpid;
		} else if (shape instanceof d3._Surface) {
			dummy.t = 'Surface';
			dummy.a = [];
			for(var i = 0, ii=shape.atoms.length; i<ii; i++){
				dummy.a.push(shape.atoms[i].tmpid);
			}
			if(!(shape instanceof d3.VDWSurface)){
				dummy.p = shape.probeRadius;
			}
			dummy.r = shape.resolution;
			var type = 'vdw';
			if(shape instanceof d3.SASSurface){
				type = 'sas';
			}else if(d3.SESSurface && shape instanceof d3.SESSurface){
				type = 'ses';
			}
			dummy.f = type;
		} else if (shape instanceof d3.UnitCell) {
			dummy.t = 'UnitCell';
			for (var p in shape.unitCell) {
		        dummy[p] = shape.unitCell[p];
		    }
		}
		return dummy;
	};
	_.shapeFrom = function(dummy, mols) {
		var shape;
		if (dummy.t === 'Line') {
			shape = new d2.Line(new structures.Point(dummy.x1, dummy.y1), new structures.Point(dummy.x2, dummy.y2));
			shape.arrowType = dummy.a;
		} else if (dummy.t === 'Pusher') {
			var o1, o2;
			for ( var i = 0, ii = mols.length; i < ii; i++) {
				var mol = mols[i];
				for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
					var a = mol.atoms[j];
					if (a.tmpid === dummy.o1) {
						o1 = a;
					} else if (a.tmpid === dummy.o2) {
						o2 = a;
					}
				}
				for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
					var b = mol.bonds[j];
					if (b.tmpid === dummy.o1) {
						o1 = b;
					} else if (b.tmpid === dummy.o2) {
						o2 = b;
					}
				}
			}
			shape = new d2.Pusher(o1, o2);
			if (dummy.e) {
				shape.numElectron = dummy.e;
			}
		} else if (dummy.t === 'AtomMapping') {
			var a1, a2;
			for ( var i = 0, ii = mols.length; i < ii; i++) {
				var mol = mols[i];
				for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
					var a = mol.atoms[j];
					if (a.tmpid === dummy.a1) {
						a1 = a;
					} else if (a.tmpid === dummy.a2) {
						a2 = a;
					}
				}
			}
			shape = new d2.AtomMapping(a1, a2);
		} else if (dummy.t === 'Bracket') {
			shape = new d2.Bracket(new structures.Point(dummy.x1, dummy.y1), new structures.Point(dummy.x2, dummy.y2));
			if (dummy.c !== undefined) {
				// have to check against undefined as it is an integer that can
				// be 0
				shape.charge = dummy.c;
			}
			if (dummy.m !== undefined) {
				// have to check against undefined as it is an integer that can
				// be 0
				shape.mult = dummy.m;
			}
			if (dummy.r !== undefined) {
				// have to check against undefined as it is an integer that can
				// be 0
				shape.repeat = dummy.r;
			}
		} else if (dummy.t === 'DynamicBracket') {
			var b1, b2;
			for ( var i = 0, ii = mols.length; i < ii; i++) {
				var mol = mols[i];
				for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
					var b = mol.bonds[j];
					if (b.tmpid === dummy.b1) {
						b1 = b;
					} else if (b.tmpid === dummy.b2) {
						b2 = b;
					}
				}
			}
			shape = new d2.DynamicBracket(b1, b2);
			shape.n1 = dummy.n1;
			shape.n2 = dummy.n2;
			if(dummy.f){
				shape.flip = true;
			}
		} else if (dummy.t === 'VAP') {
			shape = new d2.VAP(dummy.x, dummy.y);
			if(dummy.o){
				shape.bondType = dummy.o;
			}
			for ( var i = 0, ii = mols.length; i < ii; i++) {
				var mol = mols[i];
				for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
					var a = mol.atoms[j];
					if (a.tmpid === dummy.s) {
						shape.substituent = a;
					} else {
						for(var k = 0, kk = dummy.a.length; k<kk; k++){
							if(a.tmpid === dummy.a[k]){
								shape.attachments.push(a);
							}
						}
					}
				}
			}
		} else if (dummy.t === 'Distance') {
			var a1, a2;
			for ( var i = 0, ii = mols.length; i < ii; i++) {
				var mol = mols[i];
				for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
					var a = mol.atoms[j];
					if (a.tmpid === dummy.a1) {
						a1 = a;
					} else if (a.tmpid === dummy.a2) {
						a2 = a;
					}
				}
			}
			shape = new d3.Distance(a1, a2, dummy.n, dummy.o);
		} else if (dummy.t === 'Angle') {
			var a1, a2, a3;
			for ( var i = 0, ii = mols.length; i < ii; i++) {
				var mol = mols[i];
				for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
					var a = mol.atoms[j];
					if (a.tmpid === dummy.a1) {
						a1 = a;
					} else if (a.tmpid === dummy.a2) {
						a2 = a;
					} else if (a.tmpid === dummy.a3) {
						a3 = a;
					}
				}
			}
			shape = new d3.Angle(a1, a2, a3);
		} else if (dummy.t === 'Torsion') {
			var a1, a2, a3, a4;
			for ( var i = 0, ii = mols.length; i < ii; i++) {
				var mol = mols[i];
				for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
					var a = mol.atoms[j];
					if (a.tmpid === dummy.a1) {
						a1 = a;
					} else if (a.tmpid === dummy.a2) {
						a2 = a;
					} else if (a.tmpid === dummy.a3) {
						a3 = a;
					} else if (a.tmpid === dummy.a4) {
						a4 = a;
					}
				}
			}
			shape = new d3.Torsion(a1, a2, a3, a4);
		} else if (dummy.t === 'Surface') {
			var atoms = [];
			for ( var i = 0, ii = mols.length; i < ii; i++) {
				var mol = mols[i];
				for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
					var a = mol.atoms[j];
					for(var k = 0, kk = dummy.a.length; k<kk; k++){
						if(a.tmpid === dummy.a[k]){
							atoms.push(a);
						}
					}
				}
			}
			var probeRadius = dummy.p?dummy.p:1.4;
			var resolution = dummy.r?dummy.r:30;
			if(dummy.f==='vdw'){
				shape = new d3.VDWSurface(atoms, resolution);
			}else if(dummy.f==='sas'){
				shape = new d3.SASSurface(atoms, probeRadius, resolution);
			}else if(dummy.f==='ses'){
				shape = new d3.SESSurface(atoms, probeRadius, resolution);
			}
		} else if (dummy.t === 'UnitCell') {
			var unitCellVectors = {};
			for (var p in dummy) {
				unitCellVectors[p] = dummy[p];
		    }
			shape = new d3.UnitCell(unitCellVectors);
		}
		return shape;
	};
	_.pdbFrom = function(content) {
		var mol = this.molFrom(content.mol);
		mol.findRings = false;
		// mark from JSON to note to algorithms that atoms in chain are not
		// same
		// objects as in atom array
		mol.fromJSON = true;
		mol.chains = this.chainsFrom(content.ribbons);
		return mol;
	};
	_.chainsFrom = function(content) {
		var chains = [];
		for ( var i = 0, ii = content.cs.length; i < ii; i++) {
			var chain = content.cs[i];
			var c = [];
			for ( var j = 0, jj = chain.length; j < jj; j++) {
				var convert = chain[j];
				var r = new structures.Residue();
				r.name = convert.n;
				r.cp1 = new structures.Atom('', convert.x1, convert.y1, convert.z1);
				r.cp2 = new structures.Atom('', convert.x2, convert.y2, convert.z2);
				if (convert.x3) {
					r.cp3 = new structures.Atom('', convert.x3, convert.y3, convert.z3);
					r.cp4 = new structures.Atom('', convert.x4, convert.y4, convert.z4);
					r.cp5 = new structures.Atom('', convert.x5, convert.y5, convert.z5);
				}
				r.helix = convert.h;
				r.sheet = convert.s;
				r.arrow = j > 0 && chain[j - 1].a;
				c.push(r);
			}
			chains.push(c);
		}
		return chains;
	};

	// shortcuts
	var interpreter = new io.JSONInterpreter();
	c.readJSON = function(string) {
		var obj;
		try {
			obj = JSON.parse(string);
		} catch (e) {
			// not json
			return undefined;
		}
		if (obj) {
			if (obj.m || obj.s) {
				return interpreter.contentFrom(obj);
			} else if (obj.a) {
				return obj = {
					molecules : [ interpreter.molFrom(obj) ],
					shapes : []
				};
			} else {
				return obj = {
					molecules : [],
					shapes : []
				};
			}
		}
		return undefined;
	};
	c.writeJSON = function(mols, shapes) {
		return JSON.stringify(interpreter.contentTo(mols, shapes));
	};

})(ChemDoodle, ChemDoodle.io, ChemDoodle.structures, ChemDoodle.structures.d2, ChemDoodle.structures.d3, JSON);
(function(c, io, structures, undefined) {
	'use strict';
	io.RXNInterpreter = function() {
	};
	var _ = io.RXNInterpreter.prototype = new io._Interpreter();
	_.read = function(content, multiplier) {
		if (!multiplier) {
			multiplier = c.default_bondLength_2D;
		}
		var molecules = [];
		var line;
		if (!content) {
			molecules.push(new structures.Molecule());
			line = new structures.d2.Line(new structures.Point(-20, 0), new structures.Point(20, 0));
		} else {
			var contentTokens = content.split('$MOL\n');
			var headerTokens = contentTokens[0].split('\n');
			var counts = headerTokens[4];
			var numReactants = parseInt(counts.substring(0, 3));
			var numProducts = parseInt(counts.substring(3, 6));
			var currentMolecule = 1;
			var start = 0;
			for ( var i = 0, ii = numReactants + numProducts; i < ii; i++) {
				molecules[i] = c.readMOL(contentTokens[currentMolecule], multiplier);
				var b = molecules[i].getBounds();
				var width = b.maxX - b.minX;
				start -= width + 40;
				currentMolecule++;
			}
			for ( var i = 0, ii = numReactants; i < ii; i++) {
				var b = molecules[i].getBounds();
				var width = b.maxX - b.minX;
				var center = molecules[i].getCenter();
				for ( var j = 0, jj = molecules[i].atoms.length; j < jj; j++) {
					var a = molecules[i].atoms[j];
					a.x += start + (width / 2) - center.x;
					a.y -= center.y;
				}
				start += width + 40;
			}
			line = new structures.d2.Line(new structures.Point(start, 0), new structures.Point(start + 40, 0));
			start += 80;
			for ( var i = numReactants, ii = numReactants + numProducts; i < ii; i++) {
				var b = molecules[i].getBounds();
				var width = b.maxX - b.minX;
				var center = molecules[i].getCenter();
				for ( var j = 0; j < molecules[i].atoms.length; j++) {
					var a = molecules[i].atoms[j];
					a.x += start + (width / 2) - center.x;
					a.y -= center.y;
				}
				start += width + 40;
			}
		}
		line.arrowType = structures.d2.Line.ARROW_SYNTHETIC;
		return {
			'molecules' : molecules,
			'shapes' : [ line ]
		};
	};
	_.write = function(mols, shapes) {
		var molecules = [ [], [] ];
		var ps = undefined;
		if (!mols || !shapes) {
			return;
		}
		for (i = 0, ii = shapes.length; i < ii; i++) {
			if (shapes[i] instanceof structures.d2.Line) {
				ps = shapes[i].getPoints();
				break;
			}
		}
		if (!ps) {
			return '';
		}
		for ( var i = 0, ii = mols.length; i < ii; i++) {
			var center = mols[i].getCenter();
			if (center.x < ps[1].x) {
				molecules[0].push(mols[i]);
			} else {
				molecules[1].push(mols[i]);
			}
		}
		var sb = [];
		sb.push('$RXN\nReaction from ChemDoodle Web Components\n\nhttp://www.ichemlabs.com\n');
		sb.push(this.fit(molecules[0].length.toString(), 3));
		sb.push(this.fit(molecules[1].length.toString(), 3));
		sb.push('\n');
		for ( var i = 0; i < 2; i++) {
			for ( var j = 0, jj = molecules[i].length; j < jj; j++) {
				sb.push('$MOL\n');
				sb.push(c.writeMOL(molecules[i][j]));
				sb.push('\n');
			}
		}
		return sb.join('');
	};

	// shortcuts
	var interpreter = new io.RXNInterpreter();
	c.readRXN = function(content, multiplier) {
		return interpreter.read(content, multiplier);
	};
	c.writeRXN = function(mols, shapes) {
		return interpreter.write(mols, shapes);
	};

})(ChemDoodle, ChemDoodle.io, ChemDoodle.structures);

(function(c, ELEMENT, SYMBOLS, io, structures, trim, undefined) {
	'use strict';
	io.XYZInterpreter = function() {
	};
	var _ = io.XYZInterpreter.prototype = new io._Interpreter();
	_.deduceCovalentBonds = true;
	_.read = function(content) {
		var molecule = new structures.Molecule();
		if (!content) {
			return molecule;
		}
		var lines = content.split('\n');

		var numAtoms = parseInt(trim(lines[0]));

		for ( var i = 0; i < numAtoms; i++) {
			var line = lines[i + 2];
			var tokens = line.split(/\s+/g);
			molecule.atoms[i] = new structures.Atom(isNaN(tokens[0]) ? tokens[0] : SYMBOLS[parseInt(tokens[0]) - 1], parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
		}
		if (this.deduceCovalentBonds) {
			new c.informatics.BondDeducer().deduceCovalentBonds(molecule, 1);
		}
		return molecule;
	};

	// shortcuts
	var interpreter = new io.XYZInterpreter();
	c.readXYZ = function(content) {
		return interpreter.read(content);
	};

})(ChemDoodle, ChemDoodle.ELEMENT, ChemDoodle.SYMBOLS, ChemDoodle.io, ChemDoodle.structures, ChemDoodle.lib.jQuery.trim);

ChemDoodle.monitor = (function(featureDetection, q, document, undefined) {
	'use strict';
	var m = {};

	m.CANVAS_DRAGGING = undefined;
	m.CANVAS_OVER = undefined;
	m.ALT = false;
	m.SHIFT = false;
	m.META = false;

	if (!featureDetection.supports_touch()) {
		q(document).ready(function() {
			// handles dragging beyond the canvas bounds
			q(document).mousemove(function(e) {
				if (m.CANVAS_DRAGGING) {
					if (m.CANVAS_DRAGGING.drag) {
						m.CANVAS_DRAGGING.prehandleEvent(e);
						m.CANVAS_DRAGGING.drag(e);
					}
				}
			});
			q(document).mouseup(function(e) {
				if (m.CANVAS_DRAGGING && m.CANVAS_DRAGGING !== m.CANVAS_OVER) {
					if (m.CANVAS_DRAGGING.mouseup) {
						m.CANVAS_DRAGGING.prehandleEvent(e);
						m.CANVAS_DRAGGING.mouseup(e);
					}
				}
				m.CANVAS_DRAGGING = undefined;
			});
			// handles modifier keys from a single keyboard
			q(document).keydown(function(e) {
				m.SHIFT = e.shiftKey;
				m.ALT = e.altKey;
				m.META = e.metaKey || e.ctrlKey;
				var affecting = m.CANVAS_OVER;
				if (m.CANVAS_DRAGGING) {
					affecting = m.CANVAS_DRAGGING;
				}
				if (affecting) {
					if (affecting.keydown) {
						affecting.prehandleEvent(e);
						affecting.keydown(e);
					}
				}
			});
			q(document).keypress(function(e) {
				var affecting = m.CANVAS_OVER;
				if (m.CANVAS_DRAGGING) {
					affecting = m.CANVAS_DRAGGING;
				}
				if (affecting) {
					if (affecting.keypress) {
						affecting.prehandleEvent(e);
						affecting.keypress(e);
					}
				}
			});
			q(document).keyup(function(e) {
				m.SHIFT = e.shiftKey;
				m.ALT = e.altKey;
				m.META = e.metaKey || e.ctrlKey;
				var affecting = m.CANVAS_OVER;
				if (m.CANVAS_DRAGGING) {
					affecting = m.CANVAS_DRAGGING;
				}
				if (affecting) {
					if (affecting.keyup) {
						affecting.prehandleEvent(e);
						affecting.keyup(e);
					}
				}
			});
		});
	}

	return m;

})(ChemDoodle.featureDetection, ChemDoodle.lib.jQuery, document);

(function(c, featureDetection, math, monitor, structures, q, m, document, window, userAgent, undefined) {
	'use strict';
	c._Canvas = function() {
	};
	var _ = c._Canvas.prototype;
	_.molecules = undefined;
	_.shapes = undefined;
	_.emptyMessage = undefined;
	_.image = undefined;
	_.repaint = function() {
		if (this.test) {
			return;
		}
		var canvas = document.getElementById(this.id);
		if (canvas.getContext) {
			var ctx = canvas.getContext('2d');
			if (this.pixelRatio !== 1 && canvas.width === this.width) {
				canvas.width = this.width * this.pixelRatio;
				canvas.height = this.height * this.pixelRatio;
				ctx.scale(this.pixelRatio, this.pixelRatio);
			}
			if (!this.image) {
				if (this.specs.backgroundColor && this.bgCache !== canvas.style.backgroundColor) {
					canvas.style.backgroundColor = this.specs.backgroundColor;
					this.bgCache = canvas.style.backgroundColor;
				}
				// clearRect is correct, but doesn't work as expected on Android
				// ctx.clearRect(0, 0, this.width, this.height);
				ctx.fillStyle = this.specs.backgroundColor;
				ctx.fillRect(0, 0, this.width, this.height);
			} else {
				ctx.drawImage(this.image, 0, 0);
			}
			if (this.innerRepaint) {
				this.innerRepaint(ctx);
			} else {
				if (this.molecules.length !== 0 || this.shapes.length !== 0) {
					ctx.save();
					ctx.translate(this.width / 2, this.height / 2);
					ctx.rotate(this.specs.rotateAngle);
					ctx.scale(this.specs.scale, this.specs.scale);
					ctx.translate(-this.width / 2, -this.height / 2);
					for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
						this.molecules[i].check(true);
						this.molecules[i].draw(ctx, this.specs);
					}
					if(this.checksOnAction){
						// checksOnAction() must be called after checking molecules, as it depends on molecules being correct
						// this function is only used by the uis
						this.checksOnAction(true);
					}
					for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
						this.shapes[i].draw(ctx, this.specs);
					}
					ctx.restore();
				} else if (this.emptyMessage) {
					ctx.fillStyle = '#737683';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.font = '18px Helvetica, Verdana, Arial, Sans-serif';
					ctx.fillText(this.emptyMessage, this.width / 2, this.height / 2);
				}
			}
			if (this.drawChildExtras) {
				this.drawChildExtras(ctx, this.specs);
			}
		}
	};
	_.resize = function(w, h) {
		var cap = q('#' + this.id);
		cap.attr({
			width : w,
			height : h
		});
		cap.css('width', w);
		cap.css('height', h);
		this.width = w;
		this.height = h;
		if (c._Canvas3D && this instanceof c._Canvas3D) {
			var wu = w;
			var hu = h;
			if (this.pixelRatio !== 1) {
				wu *= this.pixelRatio;
				hu *= this.pixelRatio;
				this.gl.canvas.width = wu;
				this.gl.canvas.height = hu;
			}
			this.gl.viewport(0, 0, wu, hu);
			this.afterLoadContent();
		} else if (this.molecules.length > 0) {
			this.center();
			for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
				this.molecules[i].check();
			}
		}
		this.repaint();
	};
	_.setBackgroundImage = function(path) {
		this.image = new Image(); // Create new Image object
		var me = this;
		this.image.onload = function() {
			me.repaint();
		};
		this.image.src = path; // Set source path
	};
	_.loadMolecule = function(molecule) {
		this.clear();
		this.molecules.push(molecule);
		// do this twice to center based on atom labels, which must be first rendered to be considered in bounds
		for(var i = 0; i<2; i++){
			this.center();
			if (!(c._Canvas3D && this instanceof c._Canvas3D)) {
				molecule.check();
			}
			if (this.afterLoadContent) {
				this.afterLoadContent();
			}
			this.repaint();
		}
	};
	_.loadContent = function(mols, shapes) {
		this.molecules = mols?mols:[];
		this.shapes = shapes?shapes:[];
		// do this twice to center based on atom labels, which must be first rendered to be considered in bounds
		for(var i = 0; i<2; i++){
			this.center();
			if (!(c._Canvas3D && this instanceof c._Canvas3D)) {
				for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
					this.molecules[i].check();
				}
			}
			if (this.afterLoadContent) {
				this.afterLoadContent();
			}
			this.repaint();
		}
	};
	_.addMolecule = function(molecule) {
		this.molecules.push(molecule);
		if (!(c._Canvas3D && this instanceof c._Canvas3D)) {
			molecule.check();
		}
		this.repaint();
	};
	_.removeMolecule = function(mol) {
		this.molecules = q.grep(this.molecules, function(value) {
			return value !== mol;
		});
		this.repaint();
	};
	_.getMolecule = function() {
		return this.molecules.length > 0 ? this.molecules[0] : undefined;
	};
	_.getMolecules = function() {
		return this.molecules;
	};
	_.addShape = function(shape) {
		this.shapes.push(shape);
		this.repaint();
	};
	_.removeShape = function(shape) {
		this.shapes = q.grep(this.shapes, function(value) {
			return value !== shape;
		});
		this.repaint();
	};
	_.getShapes = function() {
		return this.shapes;
	};
	_.clear = function() {
		this.molecules = [];
		this.shapes = [];
		this.specs.scale = 1;
		this.repaint();
	};
	_.center = function() {
		var bounds = this.getContentBounds();
		var center = new structures.Point((this.width - bounds.minX - bounds.maxX) / 2, (this.height - bounds.minY - bounds.maxY) / 2);
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			var mol = this.molecules[i];
			for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
				mol.atoms[j].add(center);
			}
		}
		for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
			var sps = this.shapes[i].getPoints();
			for ( var j = 0, jj = sps.length; j < jj; j++) {
				sps[j].add(center);
			}
		}
		this.specs.scale = 1;
		var difX = bounds.maxX - bounds.minX;
		var difY = bounds.maxY - bounds.minY;
		if (difX > this.width-20 || difY > this.height-20) {
			this.specs.scale = m.min(this.width / difX, this.height / difY) * .85;
		}
	};
	_.bondExists = function(a1, a2) {
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			var mol = this.molecules[i];
			for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
				var b = mol.bonds[j];
				if (b.contains(a1) && b.contains(a2)) {
					return true;
				}
			}
		}
		return false;
	};
	_.getBond = function(a1, a2) {
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			var mol = this.molecules[i];
			for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
				var b = mol.bonds[j];
				if (b.contains(a1) && b.contains(a2)) {
					return b;
				}
			}
		}
		return undefined;
	};
	_.getMoleculeByAtom = function(a) {
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			var mol = this.molecules[i];
			if (mol.atoms.indexOf(a) !== -1) {
				return mol;
			}
		}
		return undefined;
	};
	_.getAllAtoms = function() {
		var as = [];
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			as = as.concat(this.molecules[i].atoms);
		}
		return as;
	};
	_.getAllBonds = function() {
		var bs = [];
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			bs = bs.concat(this.molecules[i].bonds);
		}
		return bs;
	};
	_.getAllPoints = function() {
		var ps = [];
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			ps = ps.concat(this.molecules[i].atoms);
		}
		for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
			ps = ps.concat(this.shapes[i].getPoints());
		}
		return ps;
	};
	_.getContentBounds = function() {
		var bounds = new math.Bounds();
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			bounds.expand(this.molecules[i].getBounds());
		}
		for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
			bounds.expand(this.shapes[i].getBounds());
		}
		return bounds;
	};
	_.create = function(id, width, height) {
		this.id = id;
		this.width = width;
		this.height = height;
		this.molecules = [];
		this.shapes = [];
		if (document.getElementById(id)) {
			var canvas = q('#' + id);
			if (!width) {
				this.width = canvas.attr('width');
			} else {
				canvas.attr('width', width);
			}
			if (!height) {
				this.height = canvas.attr('height');
			} else {
				canvas.attr('height', height);
			}
			// If the canvas is pre-created, make sure that the class attribute
			// is specified.
			canvas.attr('class', 'ChemDoodleWebComponent');
		} else if (!c.featureDetection.supports_canvas_text() && userAgent.indexOf("MSIE") != -1) {
			// Install Google Chrome Frame
			document.writeln('<div style="border: 1px solid black;" width="' + width + '" height="' + height + '">Please install <a href="http://code.google.com/chrome/chromeframe/">Google Chrome Frame</a>, then restart Internet Explorer.</div>');
			return;
		} else {
			document.writeln('<canvas class="ChemDoodleWebComponent" id="' + id + '" width="' + width + '" height="' + height + '" alt="ChemDoodle Web Component">This browser does not support HTML5/Canvas.</canvas>');
		}
		var jqCapsule = q('#' + id);
		jqCapsule.css('width', this.width);
		jqCapsule.css('height', this.height);
		this.pixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
		this.specs = new structures.VisualSpecifications();
		// setup input events
		// make sure prehandle events are only in if statements if handled, so
		// as not to block browser events
		var me = this;
		if (featureDetection.supports_touch()) {
			// for iPhone OS and Android devices (and other mobile browsers that
			// support mobile events)
			jqCapsule.bind('touchstart', function(e) {
				var time = new Date().getTime();
				if (!featureDetection.supports_gesture() && e.originalEvent.touches.length === 2) {
					// on some platforms, like Android, there is no gesture
					// support, so we have to implement it
					var ts = e.originalEvent.touches;
					var p1 = new structures.Point(ts[0].pageX, ts[0].pageY);
					var p2 = new structures.Point(ts[1].pageX, ts[1].pageY);
					me.implementedGestureDist = p1.distance(p2);
					me.implementedGestureAngle = p1.angle(p2);
					if (me.gesturestart) {
						me.prehandleEvent(e);
						me.gesturestart(e);
					}
				}
				if (me.lastTouch && e.originalEvent.touches.length === 1 && (time - me.lastTouch) < 500) {
					if (me.dbltap) {
						me.prehandleEvent(e);
						me.dbltap(e);
					} else if (me.dblclick) {
						me.prehandleEvent(e);
						me.dblclick(e);
					} else if (me.touchstart) {
						me.prehandleEvent(e);
						me.touchstart(e);
					} else if (me.mousedown) {
						me.prehandleEvent(e);
						me.mousedown(e);
					}
				} else if (me.touchstart) {
					me.prehandleEvent(e);
					me.touchstart(e);
					if (this.hold) {
						clearTimeout(this.hold);
					}
					if (this.touchhold) {
						this.hold = setTimeout(function() {
							me.touchhold(e);
						}, 1000);
					}
				} else if (me.mousedown) {
					me.prehandleEvent(e);
					me.mousedown(e);
				}
				me.lastTouch = time;
			});
			jqCapsule.bind('touchmove', function(e) {
				if (this.hold) {
					clearTimeout(this.hold);
					this.hold = undefined;
				}
				if (!featureDetection.supports_gesture() && e.originalEvent.touches.length === 2) {
					// on some platforms, like Android, there is no gesture
					// support, so we have to implement it
					if (me.gesturechange) {
						var ts = e.originalEvent.touches;
						var p1 = new structures.Point(ts[0].pageX, ts[0].pageY);
						var p2 = new structures.Point(ts[1].pageX, ts[1].pageY);
						var newDist = p1.distance(p2);
						var newAngle = p1.angle(p2);
						e.originalEvent.scale = newDist / me.implementedGestureDist;
						e.originalEvent.rotation = 180 * (me.implementedGestureAngle - newAngle) / m.PI;
						me.prehandleEvent(e);
						me.gesturechange(e);
					}
				}
				if (e.originalEvent.touches.length > 1 && me.multitouchmove) {
					var numFingers = e.originalEvent.touches.length;
					me.prehandleEvent(e);
					var center = new structures.Point(-e.offset.left * numFingers, -e.offset.top * numFingers);
					for ( var i = 0; i < numFingers; i++) {
						center.x += e.originalEvent.changedTouches[i].pageX;
						center.y += e.originalEvent.changedTouches[i].pageY;
					}
					center.x /= numFingers;
					center.y /= numFingers;
					e.p = center;
					me.multitouchmove(e, numFingers);
				} else if (me.touchmove) {
					me.prehandleEvent(e);
					me.touchmove(e);
				} else if (me.drag) {
					me.prehandleEvent(e);
					me.drag(e);
				}
			});
			jqCapsule.bind('touchend', function(e) {
				if (this.hold) {
					clearTimeout(this.hold);
					this.hold = undefined;
				}
				if (!featureDetection.supports_gesture() && me.implementedGestureDist) {
					// on some platforms, like Android, there is no gesture
					// support, so we have to implement it
					me.implementedGestureDist = undefined;
					me.implementedGestureAngle = undefined;
					if (me.gestureend) {
						me.prehandleEvent(e);
						me.gestureend(e);
					}
				}
				if (me.touchend) {
					me.prehandleEvent(e);
					me.touchend(e);
				} else if (me.mouseup) {
					me.prehandleEvent(e);
					me.mouseup(e);
				}
				if ((new Date().getTime() - me.lastTouch) < 250) {
					if (me.tap) {
						me.prehandleEvent(e);
						me.tap(e);
					} else if (me.click) {
						me.prehandleEvent(e);
						me.click(e);
					}
				}
			});
			jqCapsule.bind('gesturestart', function(e) {
				if (me.gesturestart) {
					me.prehandleEvent(e);
					me.gesturestart(e);
				}
			});
			jqCapsule.bind('gesturechange', function(e) {
				if (me.gesturechange) {
					me.prehandleEvent(e);
					me.gesturechange(e);
				}
			});
			jqCapsule.bind('gestureend', function(e) {
				if (me.gestureend) {
					me.prehandleEvent(e);
					me.gestureend(e);
				}
			});
		} else {
			// normal events
			// some mobile browsers will simulate mouse events, so do not set
			// these
			// events if mobile, or it will interfere with the handling of touch
			// events
			jqCapsule.click(function(e) {
				switch (e.which) {
				case 1:
					// left mouse button pressed
					if (me.click) {
						me.prehandleEvent(e);
						me.click(e);
					}
					break;
				case 2:
					// middle mouse button pressed
					if (me.middleclick) {
						me.prehandleEvent(e);
						me.middleclick(e);
					}
					break;
				case 3:
					// right mouse button pressed
					if (me.rightclick) {
						me.prehandleEvent(e);
						me.rightclick(e);
					}
					break;
				}
			});
			jqCapsule.dblclick(function(e) {
				if (me.dblclick) {
					me.prehandleEvent(e);
					me.dblclick(e);
				}
			});
			jqCapsule.mousedown(function(e) {
				switch (e.which) {
				case 1:
					// left mouse button pressed
					monitor.CANVAS_DRAGGING = me;
					if (me.mousedown) {
						me.prehandleEvent(e);
						me.mousedown(e);
					}
					break;
				case 2:
					// middle mouse button pressed
					if (me.middlemousedown) {
						me.prehandleEvent(e);
						me.middlemousedown(e);
					}
					break;
				case 3:
					// right mouse button pressed
					if (me.rightmousedown) {
						me.prehandleEvent(e);
						me.rightmousedown(e);
					}
					break;
				}
			});
			jqCapsule.mousemove(function(e) {
				if (!monitor.CANVAS_DRAGGING && me.mousemove) {
					me.prehandleEvent(e);
					me.mousemove(e);
				}
			});
			jqCapsule.mouseout(function(e) {
				monitor.CANVAS_OVER = undefined;
				if (me.mouseout) {
					me.prehandleEvent(e);
					me.mouseout(e);
				}
			});
			jqCapsule.mouseover(function(e) {
				monitor.CANVAS_OVER = me;
				if (me.mouseover) {
					me.prehandleEvent(e);
					me.mouseover(e);
				}
			});
			jqCapsule.mouseup(function(e) {
				switch (e.which) {
				case 1:
					// left mouse button pressed
					if (me.mouseup) {
						me.prehandleEvent(e);
						me.mouseup(e);
					}
					break;
				case 2:
					// middle mouse button pressed
					if (me.middlemouseup) {
						me.prehandleEvent(e);
						me.middlemouseup(e);
					}
					break;
				case 3:
					// right mouse button pressed
					if (me.rightmouseup) {
						me.prehandleEvent(e);
						me.rightmouseup(e);
					}
					break;
				}
			});
			jqCapsule.mousewheel(function(e, delta) {
				if (me.mousewheel) {
					me.prehandleEvent(e);
					me.mousewheel(e, delta);
				}
			});
		}
		if (this.subCreate) {
			this.subCreate();
		}
	};
	_.prehandleEvent = function(e) {
		if (e.originalEvent.changedTouches) {
			e.pageX = e.originalEvent.changedTouches[0].pageX;
			e.pageY = e.originalEvent.changedTouches[0].pageY;
		}
		if(!this.doEventDefault){
			e.preventDefault();
			e.returnValue = false;
		}
		e.offset = q('#' + this.id).offset();
		e.p = new structures.Point(e.pageX - e.offset.left, e.pageY - e.offset.top);
	};
	
})(ChemDoodle, ChemDoodle.featureDetection, ChemDoodle.math, ChemDoodle.monitor, ChemDoodle.structures, ChemDoodle.lib.jQuery, Math, document, window, navigator.userAgent);

(function(c, animations, undefined) {
	'use strict';
	c._AnimatorCanvas = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	var _ = c._AnimatorCanvas.prototype = new c._Canvas();
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

})(ChemDoodle, ChemDoodle.animations);

(function(c, document, undefined) {
	'use strict';
	c.FileCanvas = function(id, width, height, action) {
		if (id) {
			this.create(id, width, height);
		}
		var form = '<br><form name="FileForm" enctype="multipart/form-data" method="POST" action="' + action + '" target="HiddenFileFrame"><input type="file" name="f" /><input type="submit" name="submitbutton" value="Show File" /></form><iframe id="HFF-' + id + '" name="HiddenFileFrame" height="0" width="0" style="display:none;" onLoad="GetMolFromFrame(\'HFF-' + id + '\', ' + id + ')"></iframe>';
		document.writeln(form);
		this.emptyMessage = 'Click below to load file';
		this.repaint();
	};
	c.FileCanvas.prototype = new c._Canvas();

})(ChemDoodle, document);

(function(c, undefined) {
	'use strict';
	c.HyperlinkCanvas = function(id, width, height, urlOrFunction, color, size) {
		if (id) {
			this.create(id, width, height);
		}
		this.urlOrFunction = urlOrFunction;
		this.color = color ? color : 'blue';
		this.size = size ? size : 2;
	};
	var _ = c.HyperlinkCanvas.prototype = new c._Canvas();
	_.openInNewWindow = true;
	_.hoverImage = undefined;
	_.drawChildExtras = function(ctx) {
		if (this.e) {
			if (this.hoverImage) {
				ctx.drawImage(this.hoverImage, 0, 0);
			} else {
				ctx.strokeStyle = this.color;
				ctx.lineWidth = this.size * 2;
				ctx.strokeRect(0, 0, this.width, this.height);
			}
		}
	};
	_.setHoverImage = function(url) {
		this.hoverImage = new Image();
		this.hoverImage.src = url;
	};
	_.click = function(p) {
		this.e = undefined;
		this.repaint();
		if (this.urlOrFunction instanceof Function) {
			this.urlOrFunction();
		} else {
			if (this.openInNewWindow) {
				window.open(this.urlOrFunction);
			} else {
				location.href = this.urlOrFunction;
			}
		}
	};
	_.mouseout = function(e) {
		this.e = undefined;
		this.repaint();
	};
	_.mouseover = function(e) {
		this.e = e;
		this.repaint();
	};

})(ChemDoodle);

(function(c, iChemLabs, q, document, undefined) {
	'use strict';
	c.MolGrabberCanvas = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
		var sb = [];
		sb.push('<br><input type="text" id="');
		sb.push(id);
		sb.push('_query" size="32" value="" />');
		sb.push(this.getInputFields());

		// Don't use document.writeln here, it breaks the whole page after
		// document is closed.
		document.getElementById(id);
		var canvas = q('#' + id);
		canvas.after(sb.join(''));

		var self = this;
		q('#' + id + '_submit').click(function() {
			self.search();
		});
		q('#' + id + '_query').keypress(function(e) {
			if (e.which === 13) {
				self.search();
			}
		});
		this.emptyMessage = 'Enter search term below';
		this.repaint();
	};
	var _ = c.MolGrabberCanvas.prototype = new c._Canvas();
	_.setSearchTerm = function(term) {
		q('#' + this.id + '_query').val(term);
		this.search();
	};
	_.getInputFields = function(){
		var sb = [];
		sb.push('<br><nobr>');
		sb.push('<select id="');
		sb.push(this.id);
		sb.push('_select">');
		sb.push('<option value="chemexper">ChemExper');
		sb.push('<option value="chemspider">ChemSpider');
		sb.push('<option value="pubchem" selected>PubChem');
		sb.push('</select>');
		sb.push('<button id="');
		sb.push(this.id);
		sb.push('_submit">Show Molecule</button>');
		sb.push('</nobr>');
		return sb.join('');
	};
	_.search = function() {
		this.emptyMessage = 'Searching...';
		this.clear();
		var self = this;
		iChemLabs.getMoleculeFromDatabase(q('#' + this.id + '_query').val(), {
			database : q('#' + this.id + '_select').val()
		}, function(mol) {
			self.loadMolecule(mol);
		});
	};

})(ChemDoodle, ChemDoodle.iChemLabs, ChemDoodle.lib.jQuery, document);

(function(c, m, m4, undefined) {
	'use strict';
	// keep these declaration outside the loop to avoid overhead
	var matrix = [];
	var xAxis = [ 1, 0, 0 ];
	var yAxis = [ 0, 1, 0 ];
	var zAxis = [ 0, 0, 1 ];

	c.RotatorCanvas = function(id, width, height, rotate3D) {
		if (id) {
			this.create(id, width, height);
		}
		this.rotate3D = rotate3D;
	};
	var _ = c.RotatorCanvas.prototype = new c._AnimatorCanvas();
	var increment = m.PI / 15;
	_.xIncrement = increment;
	_.yIncrement = increment;
	_.zIncrement = increment;
	_.nextFrame = function(delta) {
		if (this.molecules.length === 0 && this.shapes.length === 0) {
			this.stopAnimation();
			return;
		}
		var change = delta / 1000;
		if (this.rotate3D) {
			m4.identity(matrix);
			m4.rotate(matrix, this.xIncrement * change, xAxis);
			m4.rotate(matrix, this.yIncrement * change, yAxis);
			m4.rotate(matrix, this.zIncrement * change, zAxis);
			for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
				var m = this.molecules[i];
				for ( var j = 0, jj = m.atoms.length; j < jj; j++) {
					var a = m.atoms[j];
					var p = [ a.x - this.width / 2, a.y - this.height / 2, a.z ];
					m4.multiplyVec3(matrix, p);
					a.x = p[0] + this.width / 2;
					a.y = p[1] + this.height / 2;
					a.z = p[2];
				}
				for ( var j = 0, jj = m.rings.length; j < jj; j++) {
					m.rings[j].center = m.rings[j].getCenter();
				}
				if (this.specs.atoms_display && this.specs.atoms_circles_2D) {
					m.sortAtomsByZ();
				}
				if (this.specs.bonds_display && this.specs.bonds_clearOverlaps_2D) {
					m.sortBondsByZ();
				}
			}
			for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
				var sps = this.shapes[i].getPoints();
				for ( var j = 0, jj = sps.length; j < jj; j++) {
					var a = sps[j];
					var p = [ a.x - this.width / 2, a.y - this.height / 2, 0 ];
					m4.multiplyVec3(matrix, p);
					a.x = p[0] + this.width / 2;
					a.y = p[1] + this.height / 2;
				}
			}
		} else {
			this.specs.rotateAngle += this.zIncrement * change;
		}
	};
	_.dblclick = function(e) {
		if (this.isRunning()) {
			this.stopAnimation();
		} else {
			this.startAnimation();
		}
	};

})(ChemDoodle, Math, ChemDoodle.lib.mat4);

(function(c, animations, math, undefined) {
	'use strict';
	c.SlideshowCanvas = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	var _ = c.SlideshowCanvas.prototype = new c._AnimatorCanvas();
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

})(ChemDoodle, ChemDoodle.animations, ChemDoodle.math);

(function(c, monitor, structures, m, m4, undefined) {
	'use strict';
	c.TransformCanvas = function(id, width, height, rotate3D) {
		if (id) {
			this.create(id, width, height);
		}
		this.rotate3D = rotate3D;
	};
	var _ = c.TransformCanvas.prototype = new c._Canvas();
	_.lastPoint = undefined;
	_.rotationMultMod = 1.3;
	_.lastPinchScale = 1;
	_.lastGestureRotate = 0;
	_.mousedown = function(e) {
		this.lastPoint = e.p;
	};
	_.dblclick = function(e) {
		// center structure
		this.center();
		this.repaint();
	};
	_.drag = function(e) {
		if (!this.lastPoint.multi) {
			if (monitor.ALT) {
				var t = new structures.Point(e.p.x, e.p.y);
				t.sub(this.lastPoint);
				for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
					var mol = this.molecules[i];
					for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
						mol.atoms[j].add(t);
					}
					mol.check();
				}
				for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
					var sps = this.shapes[i].getPoints();
					for ( var j = 0, jj = sps.length; j < jj; j++) {
						sps[j].add(t);
					}
				}
				this.lastPoint = e.p;
				this.repaint();
			} else {
				if (this.rotate3D === true) {
					var diameter = m.max(this.width / 4, this.height / 4);
					var difx = e.p.x - this.lastPoint.x;
					var dify = e.p.y - this.lastPoint.y;
					var yIncrement = difx / diameter * this.rotationMultMod;
					var xIncrement = -dify / diameter * this.rotationMultMod;
					var matrix = [];
					m4.identity(matrix);
					m4.rotate(matrix, xIncrement, [ 1, 0, 0 ]);
					m4.rotate(matrix, yIncrement, [ 0, 1, 0 ]);
					for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
						var mol = this.molecules[i];
						for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
							var a = mol.atoms[j];
							var p = [ a.x - this.width / 2, a.y - this.height / 2, a.z ];
							m4.multiplyVec3(matrix, p);
							a.x = p[0] + this.width / 2;
							a.y = p[1] + this.height / 2;
							a.z = p[2];
						}
						for ( var i = 0, ii = mol.rings.length; i < ii; i++) {
							mol.rings[i].center = mol.rings[i].getCenter();
						}
						this.lastPoint = e.p;
						if (this.specs.atoms_display && this.specs.atoms_circles_2D) {
							mol.sortAtomsByZ();
						}
						if (this.specs.bonds_display && this.specs.bonds_clearOverlaps_2D) {
							mol.sortBondsByZ();
						}
					}
					this.repaint();
				} else {
					var center = new structures.Point(this.width / 2, this.height / 2);
					var before = center.angle(this.lastPoint);
					var after = center.angle(e.p);
					this.specs.rotateAngle -= (after - before);
					this.lastPoint = e.p;
					this.repaint();
				}
			}
		}
	};
	_.mousewheel = function(e, delta) {
		this.specs.scale += delta / 50;
		if (this.specs.scale < .01) {
			this.specs.scale = .01;
		}
		this.repaint();
	};
	_.multitouchmove = function(e, numFingers) {
		if (numFingers === 2) {
			if (this.lastPoint.multi) {
				var t = new structures.Point(e.p.x, e.p.y);
				t.sub(this.lastPoint);
				for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
					var m = this.molecules[i];
					for ( var j = 0, jj = m.atoms.length; j < jj; j++) {
						m.atoms[j].add(t);
					}
					m.check();
				}
				for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
					var sps = this.shapes[i].getPoints();
					for ( var j = 0, jj = sps.length; j < jj; j++) {
						sps[j].add(t);
					}
				}
				this.lastPoint = e.p;
				this.lastPoint.multi = true;
				this.repaint();
			} else {
				this.lastPoint = e.p;
				this.lastPoint.multi = true;
			}
		}
	};
	_.gesturechange = function(e) {
		if (e.originalEvent.scale - this.lastPinchScale !== 0) {
			this.specs.scale *= e.originalEvent.scale / this.lastPinchScale;
			if (this.specs.scale < .01) {
				this.specs.scale = .01;
			}
			this.lastPinchScale = e.originalEvent.scale;
		}
		if (this.lastGestureRotate - e.originalEvent.rotation !== 0) {
			var rot = (this.lastGestureRotate - e.originalEvent.rotation) / 180 * m.PI;
			var center = new structures.Point(this.width / 2, this.height / 2);
			for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
				var mol = this.molecules[i];
				for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
					var a = mol.atoms[j];
					var dist = center.distance(a);
					var angle = center.angle(a) + rot;
					a.x = center.x + dist * m.cos(angle);
					a.y = center.y - dist * m.sin(angle);
				}
				mol.check();
			}
			this.lastGestureRotate = e.originalEvent.rotation;
		}
		this.repaint();
	};
	_.gestureend = function(e) {
		this.lastPinchScale = 1;
		this.lastGestureRotate = 0;
	};

})(ChemDoodle, ChemDoodle.monitor, ChemDoodle.structures, Math, ChemDoodle.lib.mat4);

(function(c, undefined) {
	'use strict';
	c.ViewerCanvas = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	c.ViewerCanvas.prototype = new c._Canvas();

})(ChemDoodle);

(function(c, document, undefined) {
	'use strict';
	c._SpectrumCanvas = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	var _ = c._SpectrumCanvas.prototype = new c._Canvas();
	_.spectrum = undefined;
	_.emptyMessage = 'No Spectrum Loaded or Recognized';
	_.loadMolecule = undefined;
	_.getMolecule = undefined;
	_.innerRepaint = function(ctx) {
		if (this.spectrum && this.spectrum.data.length > 0) {
			this.spectrum.draw(ctx, this.specs, this.width, this.height);
		} else if (this.emptyMessage) {
			ctx.fillStyle = '#737683';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.font = '18px Helvetica, Verdana, Arial, Sans-serif';
			ctx.fillText(this.emptyMessage, this.width / 2, this.height / 2);
		}
	};
	_.loadSpectrum = function(spectrum) {
		this.spectrum = spectrum;
		this.repaint();
	};
	_.getSpectrum = function() {
		return this.spectrum;
	};
	_.getSpectrumCoordinates = function(x, y) {
		return spectrum.getInternalCoordinates(x, y, this.width, this.height);
	};

})(ChemDoodle, document);

(function(c, undefined) {
	'use strict';
	c.ObserverCanvas = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	c.ObserverCanvas.prototype = new c._SpectrumCanvas();

})(ChemDoodle);

(function(c, undefined) {
	'use strict';
	c.OverlayCanvas = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	var _ = c.OverlayCanvas.prototype = new c._SpectrumCanvas();
	_.overlaySpectra = [];
	_.superRepaint = _.innerRepaint;
	_.innerRepaint = function(ctx) {
		this.superRepaint(ctx);
		if (this.spectrum && this.spectrum.data.length > 0) {
			for ( var i = 0, ii = this.overlaySpectra.length; i < ii; i++) {
				var s = this.overlaySpectra[i];
				if (s && s.data.length > 0) {
					s.minX = this.spectrum.minX;
					s.maxX = this.spectrum.maxX;
					s.drawPlot(ctx, this.specs, this.width, this.height, this.spectrum.memory.offsetTop, this.spectrum.memory.offsetLeft, this.spectrum.memory.offsetBottom);
				}
			}
		}
	};
	_.addSpectrum = function(spectrum) {
		if (!this.spectrum) {
			this.spectrum = spectrum;
		} else {
			this.overlaySpectra.push(spectrum);
		}
	};

})(ChemDoodle);

(function(c, monitor, m, undefined) {
	'use strict';
	c.PerspectiveCanvas = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	var _ = c.PerspectiveCanvas.prototype = new c._SpectrumCanvas();
	_.dragRange = undefined;
	_.rescaleYAxisOnZoom = true;
	_.lastPinchScale = 1;
	_.mousedown = function(e) {
		this.dragRange = new c.structures.Point(e.p.x, e.p.x);
	};
	_.mouseup = function(e) {
		if (this.dragRange && this.dragRange.x !== this.dragRange.y) {
			if (!this.dragRange.multi) {
				var newScale = this.spectrum.zoom(this.dragRange.x, e.p.x, this.width, this.rescaleYAxisOnZoom);
				if (this.rescaleYAxisOnZoom) {
					this.specs.scale = newScale;
				}
			}
			this.dragRange = undefined;
			this.repaint();
		}
	};
	_.drag = function(e) {
		if (this.dragRange) {
			if (this.dragRange.multi) {
				this.dragRange = undefined;
			} else if (monitor.SHIFT) {
				this.spectrum.translate(e.p.x - this.dragRange.x, this.width);
				this.dragRange.x = e.p.x;
				this.dragRange.y = e.p.x;
			} else {
				this.dragRange.y = e.p.x;
			}
			this.repaint();
		}
	};
	_.drawChildExtras = function(ctx) {
		if (this.dragRange) {
			var xs = m.min(this.dragRange.x, this.dragRange.y);
			var xe = m.max(this.dragRange.x, this.dragRange.y);
			ctx.strokeStyle = 'gray';
			ctx.lineStyle = 1;
			ctx.beginPath();
			ctx.moveTo(xs, this.height / 2);
			for ( var i = xs; i <= xe; i++) {
				if (i % 10 < 5) {
					ctx.lineTo(i, m.round(this.height / 2));
				} else {
					ctx.moveTo(i, m.round(this.height / 2));
				}
			}
			ctx.stroke();
		}
	};
	_.mousewheel = function(e, delta) {
		this.specs.scale += delta / 10;
		if (this.specs.scale < .01) {
			this.specs.scale = .01;
		}
		this.repaint();
	};
	_.dblclick = function(e) {
		this.spectrum.setup();
		this.specs.scale = 1;
		this.repaint();
	};
	_.multitouchmove = function(e, numFingers) {
		if (numFingers === 2) {
			if (!this.dragRange || !this.dragRange.multi) {
				this.dragRange = new c.structures.Point(e.p.x, e.p.x);
				this.dragRange.multi = true;
			} else {
				this.spectrum.translate(e.p.x - this.dragRange.x, this.width);
				this.dragRange.x = e.p.x;
				this.dragRange.y = e.p.x;
				this.repaint();
			}
		}
	};
	_.gesturechange = function(e) {
		this.specs.scale *= e.originalEvent.scale / this.lastPinchScale;
		if (this.specs.scale < .01) {
			this.specs.scale = .01;
		}
		this.lastPinchScale = e.originalEvent.scale;
		this.repaint();
	};
	_.gestureend = function(e) {
		this.lastPinchScale = 1;
	};

})(ChemDoodle, ChemDoodle.monitor, Math);

(function(c, extensions, m, undefined) {
	'use strict';
	c.SeekerCanvas = function(id, width, height, seekType) {
		if (id) {
			this.create(id, width, height);
		}
		this.seekType = seekType;
	};
	var _ = c.SeekerCanvas.prototype = new c._SpectrumCanvas();
	_.superRepaint = _.innerRepaint;
	_.innerRepaint = function(ctx) {
		this.superRepaint(ctx);
		if (this.spectrum && this.spectrum.data.length > 0 && this.p) {
			// set up coords
			var renderP;
			var internalP;
			if (this.seekType === c.SeekerCanvas.SEEK_POINTER) {
				renderP = this.p;
				internalP = this.spectrum.getInternalCoordinates(renderP.x, renderP.y);
			} else if (this.seekType === c.SeekerCanvas.SEEK_PLOT || this.seekType === c.SeekerCanvas.SEEK_PEAK) {
				internalP = this.seekType === c.SeekerCanvas.SEEK_PLOT ? this.spectrum.getClosestPlotInternalCoordinates(this.p.x) : this.spectrum.getClosestPeakInternalCoordinates(this.p.x);
				if (!internalP) {
					return;
				}
				renderP = {
					x : this.spectrum.getTransformedX(internalP.x, this.specs, this.width, this.spectrum.memory.offsetLeft),
					y : this.spectrum.getTransformedY(internalP.y / 100, this.specs, this.height, this.spectrum.memory.offsetBottom, this.spectrum.memory.offsetTop)
				};
			}
			// draw point
			ctx.fillStyle = 'white';
			ctx.strokeStyle = this.specs.plots_color;
			ctx.lineWidth = this.specs.plots_width;
			ctx.beginPath();
			ctx.arc(renderP.x, renderP.y, 3, 0, m.PI * 2, false);
			ctx.fill();
			ctx.stroke();
			// draw internal coordinates
			ctx.font = extensions.getFontString(this.specs.text_font_size, this.specs.text_font_families);
			ctx.textAlign = 'left';
			ctx.textBaseline = 'bottom';
			var s = 'x:' + internalP.x.toFixed(3) + ', y:' + internalP.y.toFixed(3);
			var x = renderP.x + 3;
			var w = ctx.measureText(s).width;
			if (x + w > this.width - 2) {
				x -= 6 + w;
			}
			var y = renderP.y;
			if (y - this.specs.text_font_size - 2 < 0) {
				y += this.specs.text_font_size;
			}
			ctx.fillRect(x, y - this.specs.text_font_size, w, this.specs.text_font_size);
			ctx.fillStyle = 'black';
			ctx.fillText(s, x, y);
		}
	};
	_.mouseout = function(e) {
		this.p = undefined;
		this.repaint();
	};
	_.mousemove = function(e) {
		this.p = {
			x : e.p.x - 2,
			y : e.p.y - 3
		};
		this.repaint();
	};
	_.touchstart = function(e) {
		this.mousemove(e);
	};
	_.touchmove = function(e) {
		this.mousemove(e);
	};
	_.touchend = function(e) {
		this.mouseout(e);
	};
	c.SeekerCanvas.SEEK_POINTER = 'pointer';
	c.SeekerCanvas.SEEK_PLOT = 'plot';
	c.SeekerCanvas.SEEK_PEAK = 'peak';

})(ChemDoodle, ChemDoodle.extensions, Math);

(function(c, extensions, math, structures, d3, RESIDUE, m, document, m4, m3, v3, q, window, undefined) {
	'use strict';
	c._Canvas3D = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	var _ = c._Canvas3D.prototype = new c._Canvas();
	var _super = c._Canvas.prototype;
	_.rotationMatrix = undefined;
	_.lastPoint = undefined;
	_.emptyMessage = 'WebGL is Unavailable!';
	_.lastPinchScale = 1;
	_.lastGestureRotate = 0;
	_.afterLoadContent = function() {
		var bounds = new math.Bounds();
		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			bounds.expand(this.molecules[i].getBounds3D());
		}
		// build fog parameter
		var maxDimension3D = v3.dist([ bounds.maxX, bounds.maxY, bounds.maxZ ], [ bounds.minX, bounds.minY, bounds.minZ ]) / 2 + 1.5;
		if(maxDimension3D===Infinity){
			// there is no content
			maxDimension3D = 10;
		}
		
		this.maxDimension = m.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

		var fov         = m.min(179.9, m.max(this.specs.projectionPerspectiveVerticalFieldOfView_3D, 0.1));
		var theta       = fov / 360 * m.PI;
		var tanTheta    = m.tan(theta) / 0.8;
		var top         = maxDimension3D;
		var focalLength = top / tanTheta;
		var near        = focalLength - top;
		var far         = focalLength + top;
		var aspect      = this.width / this.height;

		this.camera.fieldOfView = fov;
		this.camera.near = near;
		this.camera.far = far;
		this.camera.aspect = aspect;
		m4.translate(m4.identity(this.camera.viewMatrix), [ 0, 0, -focalLength]);

		var lightFocalLength = top / m.tan(theta);
		
		this.lighting.camera.fieldOfView = fov;
		this.lighting.camera.near = lightFocalLength - top;
		this.lighting.camera.far = lightFocalLength + top;
		this.lighting.updateView();

		this.setupScene();
	};
	_.renderDepthMap = function() {
		if (this.specs.shadow_3D && d3.DepthShader) {

			var cullFaceEnabled = this.gl.isEnabled(this.gl.CULL_FACE);
			if(!cullFaceEnabled) { this.gl.enable(this.gl.CULL_FACE); }

			this.depthShader.useShaderProgram(this.gl);

			// current clear color
			var cs = this.gl.getParameter(this.gl.COLOR_CLEAR_VALUE);

			this.gl.clearColor(1.0, 1.0, 1.0, 0.0);

			this.lightDepthMapFramebuffer.bind(this.gl, this.shadowTextureSize, this.shadowTextureSize);

			this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

			// use light projection matrix to draw the molecule
			this.depthShader.setProjectionMatrix(this.gl, this.lighting.camera.projectionMatrix);

			this.depthShader.enableAttribsArray(this.gl);

			for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
				this.molecules[i].render(this.gl, this.specs);
			}

			this.gl.flush();

			this.depthShader.disableAttribsArray(this.gl);

			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

			// set back the clear color
			this.gl.clearColor(cs[0], cs[1], cs[2], cs[3]);

			if(!cullFaceEnabled) { this.gl.disable(this.gl.CULL_FACE); }
		}
	};// draw anything those not molecules, example compass, shapes, text etc.
	_.renderExtras = function() {

		this.phongShader.useShaderProgram(this.gl);

		this.phongShader.enableAttribsArray(this.gl);

		var transparentShapes = [];
		for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
			var s = this.shapes[i];
			if(s instanceof d3._Surface && (!s.specs && this.specs.surfaces_alpha!==1 || s.specs && s.specs.surfaces_alpha!==1)){
				transparentShapes.push(s);
			}else{
				s.render(this.gl, this.specs);
			}
		}
		
		// transparent shapes
		if(transparentShapes.length!==0){
			//this.gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
			this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
			this.gl.enable(this.gl.BLEND);
			this.gl.depthMask(false);
			for ( var i = 0, ii = transparentShapes.length; i < ii; i++) {
				var s = transparentShapes[i];
				s.render(this.gl, this.specs);
			}
			this.gl.depthMask(true);
			this.gl.disable(this.gl.BLEND);
			this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);		
		}
		

		this.phongShader.setShadow(this.gl, false);
		this.phongShader.setFogMode(this.gl, 0);
		this.phongShader.setFlatColor(this.gl, false);

		// compass use its own model view and projection matrix
		// so it need to use back the default matrix for other
		// rendering process (ex. render arbitrary text).
		if (this.specs.compass_display) {
			this.phongShader.setLightDirection(this.gl, [0, 0, -1]);
			this.compass.render(this.gl, this.specs);
		}

		this.phongShader.disableAttribsArray(this.gl);

		this.gl.flush();

		// enable blend and depth mask set to false
		this.gl.enable(this.gl.BLEND);
		this.gl.depthMask(false);
		this.labelShader.useShaderProgram(this.gl);
		// use back the default model view matrix
		this.labelShader.setMatrixUniforms(this.gl, this.gl.modelViewMatrix);
		// use back the default projection matrix
		this.labelShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);
		this.labelShader.setDimension(this.gl, this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);

		// enable vertex for draw text
		this.labelShader.enableAttribsArray(this.gl);

		// draw label molecule
		if (this.specs.atoms_displayLabels_3D) {
			this.label3D.render(this.gl, this.specs, this.getMolecules());
		}
		// draw measurement text
		if(this.specs.measurement_displayText_3D) {
			for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
				var s = this.shapes[i];
				if(s.renderText){
					s.renderText(this.gl, this.specs);
				}
			}
		}
		// draw compass X Y Z text
		if (this.specs.compass_display && this.specs.compass_displayText_3D) {
			this.compass.renderAxis(this.gl);
		}
		// disable vertex for draw text
		this.labelShader.disableAttribsArray(this.gl);

		// disable blend and depth mask set to true
		this.gl.disable(this.gl.BLEND);
		this.gl.depthMask(true);
		this.gl.flush();
		
		if (this.drawChildExtras) {
			this.drawChildExtras(this.gl);
		}

		this.gl.flush();
	};
	// molecule colors rendeing will both use on forward and deferred rendering
	_.renderColor = function() {
		this.phongShader.useShaderProgram(this.gl);

		this.gl.uniform1i(this.phongShader.shadowDepthSampleUniform, 0);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightDepthMapTexture.texture);

		this.phongShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);
		this.phongShader.setShadow(this.gl, this.specs.shadow_3D);
		this.phongShader.setFlatColor(this.gl, this.specs.flat_color_3D);
		this.phongShader.setGammaCorrection(this.gl, this.specs.gammaCorrection_3D);

		this.phongShader.setShadowTextureSize(this.gl, this.shadowTextureSize, this.shadowTextureSize);
		this.phongShader.setShadowIntensity(this.gl, this.specs.shadow_intensity_3D);

		this.phongShader.setFogMode(this.gl, this.specs.fog_mode_3D);
		this.phongShader.setFogColor(this.gl, this.fogging.colorRGB);
		this.phongShader.setFogStart(this.gl, this.fogging.fogStart);
		this.phongShader.setFogEnd(this.gl, this.fogging.fogEnd);
		this.phongShader.setFogDensity(this.gl, this.fogging.density);

		this.phongShader.setLightProjectionMatrix(this.gl, this.lighting.camera.projectionMatrix);
		this.phongShader.setLightDiffuseColor(this.gl, this.lighting.diffuseRGB);
		this.phongShader.setLightSpecularColor(this.gl, this.lighting.specularRGB);
		this.phongShader.setLightDirection(this.gl, this.lighting.direction);
		
		this.phongShader.enableAttribsArray(this.gl);

		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			this.molecules[i].render(this.gl, this.specs);
		}

		this.phongShader.disableAttribsArray(this.gl);

		this.gl.flush();
	};
	_.renderPosition = function() {
		this.positionShader.useShaderProgram(this.gl);

		this.positionShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);

		this.positionShader.enableAttribsArray(this.gl);

		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			this.molecules[i].render(this.gl, this.specs);
		}

		this.positionShader.disableAttribsArray(this.gl);

		this.gl.flush();
	};
	_.renderNormal = function() {
		this.normalShader.useShaderProgram(this.gl);
		this.normalShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);

		this.normalShader.enableAttribsArray(this.gl);

		for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
			this.molecules[i].render(this.gl, this.specs);
		}

		this.normalShader.disableAttribsArray(this.gl);

		this.gl.flush();
	};
	_.renderSSAO = function() {
		this.ssaoShader.useShaderProgram(this.gl);

		this.ssaoShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);

		this.ssaoShader.setSampleKernel(this.gl, this.ssao.sampleKernel);

		this.ssaoShader.setKernelRadius(this.gl, this.specs.ssao_kernel_radius);

		this.ssaoShader.setPower(this.gl, this.specs.ssao_power);

		this.ssaoShader.setGbufferTextureSize(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

		this.gl.uniform1i(this.ssaoShader.positionSampleUniform, 0);
		this.gl.uniform1i(this.ssaoShader.normalSampleUniform, 1);
		this.gl.uniform1i(this.ssaoShader.noiseSampleUniform, 2);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.positionTexture.texture);

		this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.normalTexture.texture);

		this.gl.activeTexture(this.gl.TEXTURE2);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssao.noiseTexture);

		this.gl.activeTexture(this.gl.TEXTURE0);

		this.ssaoShader.enableAttribsArray(this.gl);

		this.gl.quadBuffer.bindBuffers(this.gl);

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

		this.ssaoShader.disableAttribsArray(this.gl);

		this.gl.flush();

		// render ssao blur shader
		this.ssaoFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

		this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		this.ssaoBlurShader.useShaderProgram(this.gl);

		this.ssaoBlurShader.setGbufferTextureSize(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

		this.gl.uniform1i(this.ssaoBlurShader.aoSampleUniform, 0);
		this.gl.uniform1i(this.ssaoBlurShader.depthSampleUniform, 1);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture.texture);
		this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthTexture.texture);
		this.gl.activeTexture(this.gl.TEXTURE0);


		this.ssaoBlurShader.enableAttribsArray(this.gl);

		this.gl.quadBuffer.bindBuffers(this.gl);

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

		this.ssaoBlurShader.disableAttribsArray(this.gl);

		this.gl.activeTexture(this.gl.TEXTURE0);

		this.gl.flush();
	};
	_.renderOutline = function() {
		this.outlineShader.useShaderProgram(this.gl);

		this.outlineShader.setGbufferTextureSize(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

		this.outlineShader.setNormalThreshold(this.gl, this.specs.outline_normal_threshold);
		this.outlineShader.setDepthThreshold(this.gl, this.specs.outline_depth_threshold);
		this.outlineShader.setThickness(this.gl, this.specs.outline_thickness);

		this.gl.uniform1i(this.outlineShader.normalSampleUniform, 0);
		this.gl.uniform1i(this.outlineShader.depthSampleUniform, 1);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.normalTexture.texture);

		this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.depthTexture.texture);

		this.gl.activeTexture(this.gl.TEXTURE0);

		this.outlineShader.enableAttribsArray(this.gl);

		this.gl.quadBuffer.bindBuffers(this.gl);

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

		this.outlineShader.disableAttribsArray(this.gl);

		this.gl.flush();
	};
	_.deferredRender = function() {
		// get backdground color
		var bgColor = this.gl.getParameter(this.gl.COLOR_CLEAR_VALUE);
		// set background to black
		this.gl.clearColor(0.0, 0.0, 0.0, 0.0);

		// render color
		this.colorFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.renderColor();

		// render position
		this.positionFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.renderPosition();

		// render normals
		this.normalFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.renderNormal();

		// render ssao
		if(this.specs.ssao_3D && d3.SSAOShader) {
			// render ssao shading
			this.quadFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
			this.gl.clear(this.gl.COLOR_BUFFER_BIT);
			this.renderSSAO();
		} else {
			this.ssaoFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
			this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
			this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		}

		// render outline
		this.outlineFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		this.gl.clearColor(1.0, 1.0, 1.0, 1.0);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		if(this.specs.outline_3D) {
			this.renderOutline();
		}

		// set back background color
		this.gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);
		// composite render
		this.quadFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		
		this.lightingShader.useShaderProgram(this.gl);

		this.gl.uniform1i(this.lightingShader.positionSampleUniform, 0);
		this.gl.uniform1i(this.lightingShader.colorSampleUniform, 1);
		this.gl.uniform1i(this.lightingShader.ssaoSampleUniform, 2);
		this.gl.uniform1i(this.lightingShader.outlineSampleUniform, 3);

		this.gl.activeTexture(this.gl.TEXTURE0);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.positionTexture.texture);

		this.gl.activeTexture(this.gl.TEXTURE1);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.colorTexture.texture);

		this.gl.activeTexture(this.gl.TEXTURE2);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.ssaoTexture.texture);

		this.gl.activeTexture(this.gl.TEXTURE3);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.outlineTexture.texture);

		this.gl.activeTexture(this.gl.TEXTURE0);

		this.lightingShader.enableAttribsArray(this.gl);

		this.gl.quadBuffer.bindBuffers(this.gl);

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

		this.lightingShader.disableAttribsArray(this.gl);

		this.gl.flush();

		// final render
		this.fxaaFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		// setup viewport
		this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture.texture);

		this.fxaaShader.useShaderProgram(this.gl);

		this.fxaaShader.setBuffersize(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		this.fxaaShader.setAntialias(this.gl, this.specs.antialias_3D);

		this.fxaaShader.setEdgeThreshold(this.gl, this.specs.fxaa_edgeThreshold);
		this.fxaaShader.setEdgeThresholdMin(this.gl, this.specs.fxaa_edgeThresholdMin);
		this.fxaaShader.setSearchSteps(this.gl, this.specs.fxaa_searchSteps);
		this.fxaaShader.setSearchThreshold(this.gl, this.specs.fxaa_searchThreshold);
		this.fxaaShader.setSubpixCap(this.gl, this.specs.fxaa_subpixCap);
		this.fxaaShader.setSubpixTrim(this.gl, this.specs.fxaa_subpixTrim);

		this.fxaaShader.enableAttribsArray(this.gl);

		this.gl.quadBuffer.bindBuffers(this.gl);

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

		this.fxaaShader.disableAttribsArray(this.gl);

		this.gl.flush();


		// final render
		this.finalFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
		this.renderExtras();

		// set back background color
		this.gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);

		// last render
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		// setup viewport
		this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

		this.gl.bindTexture(this.gl.TEXTURE_2D, this.fxaaTexture.texture);

		this.quadShader.useShaderProgram(this.gl);

		this.quadShader.enableAttribsArray(this.gl);

		this.gl.quadBuffer.bindBuffers(this.gl);

		this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.gl.quadBuffer.vertexPositionBuffer.numItems);

		this.quadShader.disableAttribsArray(this.gl);

		this.gl.flush();
	};
	_.forwardRender = function() {
		// last render
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		// setup viewport
		this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

		this.renderColor();

		this.renderExtras();
	};
	_.repaint = function() {
		if (this.gl) {
			// set up the model view matrix to the specified transformations
			this.gl.lightViewMatrix = m4.multiply(this.lighting.camera.viewMatrix, this.rotationMatrix, []);
			this.gl.rotationMatrix = this.rotationMatrix;
			this.gl.modelViewMatrix = this.gl.lightViewMatrix;

			this.renderDepthMap();

			this.gl.modelViewMatrix = m4.multiply(this.camera.viewMatrix, this.rotationMatrix, []);

			if(this.isSupportDeferred() && (this.specs.ssao_3D || this.specs.outline_3D)) {
				this.deferredRender();
			} else {
				this.forwardRender();
			}
		}
	};
	_.pick = function(x, y, includeAtoms, includeBonds) {
		if (this.gl) {
			// draw with pick framebuffer
			var xu = x;
			var yu = this.height - y;
			if (this.pixelRatio !== 1) {
				xu *= this.pixelRatio;
				yu *= this.pixelRatio;
			}

			// set up the model view matrix to the specified transformations
			m4.multiply(this.camera.viewMatrix, this.rotationMatrix, this.gl.modelViewMatrix);
			this.gl.rotationMatrix = this.rotationMatrix;

			this.pickShader.useShaderProgram(this.gl);
			
			// current clear color
			var cs = this.gl.getParameter(this.gl.COLOR_CLEAR_VALUE);

			this.gl.clearColor(1.0, 1.0, 1.0, 0.0);
			this.pickerFramebuffer.bind(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

			this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

			// use default projection matrix to draw the molecule
			this.pickShader.setProjectionMatrix(this.gl, this.camera.projectionMatrix);

			// not need the normal for diffuse light, we need flat color
			this.pickShader.enableAttribsArray(this.gl);

			var objects = [];

			for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
				this.molecules[i].renderPickFrame(this.gl, this.specs, objects, includeAtoms, includeBonds);
			}

			this.pickShader.disableAttribsArray(this.gl);

			this.gl.flush();

			var rgba = new Uint8Array(4);
			this.gl.readPixels(xu - 2, yu + 2, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, rgba);

			var object = undefined;
			var idxMolecule = rgba[3];
			if (idxMolecule > 0) {
				var idxAtom = rgba[2] | (rgba[1] << 8) | (rgba[0] << 16);
				object = objects[idxAtom];
			}

			this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
			// set back the clear color
			this.gl.clearColor(cs[0], cs[1], cs[2], cs[3]);
			return object;
		}
		return undefined;
	};
	_.center = function() {
		var p = new structures.Atom();
		for ( var k = 0, kk = this.molecules.length; k < kk; k++) {
			var m = this.molecules[k];
			p.add3D(m.getCenter3D());
		}
		p.x /= this.molecules.length;
		p.y /= this.molecules.length;
		for ( var k = 0, kk = this.molecules.length; k < kk; k++) {
			var m = this.molecules[k];
			for ( var i = 0, ii = m.atoms.length; i < ii; i++) {
				m.atoms[i].sub3D(p);
			}
			if (m.chains && m.fromJSON) {
				for ( var i = 0, ii = m.chains.length; i < ii; i++) {
					var chain = m.chains[i];
					for ( var j = 0, jj = chain.length; j < jj; j++) {
						var residue = chain[j];
						residue.cp1.sub3D(p);
						residue.cp2.sub3D(p);
						if (residue.cp3) {
							residue.cp3.sub3D(p);
							residue.cp4.sub3D(p);
							residue.cp5.sub3D(p);
						}
					}
				}
			}
		}
	};
	_.isSupportDeferred = function() {
		return this.gl.textureFloatExt && this.gl.depthTextureExt;
	};
	_.create = function(id, width, height) {
		_super.create.call(this, id, width, height);
		// setup gl object
		try {
			var canvas = document.getElementById(this.id);
			this.gl = canvas.getContext('webgl');
			if (!this.gl) {
				this.gl = canvas.getContext('experimental-webgl');
			}
		} catch (e) {
		}
		if (this.gl) {
		
			if (this.pixelRatio !== 1 && this.gl.canvas.width === this.width) {
				this.gl.canvas.style.width = this.width + 'px';
				this.gl.canvas.style.height = this.height + 'px';
				this.gl.canvas.width = this.width * this.pixelRatio;
				this.gl.canvas.height = this.height * this.pixelRatio;
			}

			this.gl.enable(this.gl.DEPTH_TEST);
			this.gl.depthFunc(this.gl.LEQUAL);
			this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
			this.gl.clearDepth(1.0);

			// size of texture for render depth map from light view
			this.shadowTextureSize = 1024;
			// setup matrices
			this.rotationMatrix = m4.identity([]);
			// set up camera
			this.camera = new d3.Camera();

			this.label3D = new d3.Label();

			this.lighting = new d3.Light(this.specs.lightDiffuseColor_3D, this.specs.lightSpecularColor_3D, this.specs.lightDirection_3D);
			
			this.fogging = new d3.Fog(this.specs.fog_color_3D || this.specs.backgroundColor, this.specs.fog_start_3D, this.specs.fog_end_3D, this.specs.fog_density_3D);
			
			
			// uncomment this line to see shadow without depth texture extension
			this.gl.depthTextureExt = this.gl.getExtension('WEBGL_depth_texture') || this.gl.getExtension('WEBKIT_WEBGL_depth_texture') || this.gl.getExtension('MOZ_WEBGL_depth_texture');
			this.gl.textureFloatExt = this.gl.getExtension('OES_texture_float') || this.gl.getExtension('WEBKIT_OES_texture_float') || this.gl.getExtension('MOZ_OES_texture_float');
			// this.gl.shaderTextureLodExt = this.gl.getExtension('EXT_shader_texture_lod') || this.gl.getExtension('WEBKIT_EXT_shader_texture_lod') || this.gl.getExtension('MOZ_EXT_shader_texture_lod');
			// this.gl.drawBuffersExt = this.gl.getExtension('WEBGL_draw_buffers');

			this.ssao = new d3.SSAO();

			// set picker color attachment
			this.pickerColorTexture = new d3.Texture();
			this.pickerColorTexture.init(this.gl, this.gl.UNSIGNED_BYTE, this.gl.RGBA, this.gl.RGBA);

			// set picker depth attachment 
			this.pickerDepthRenderbuffer = new d3.Renderbuffer();
			this.pickerDepthRenderbuffer.init(this.gl, this.gl.DEPTH_COMPONENT16);

			// set picker framebuffer
			this.pickerFramebuffer = new d3.Framebuffer();
			this.pickerFramebuffer.init(this.gl);
			this.pickerFramebuffer.setColorTexture(this.gl, this.pickerColorTexture.texture);
			this.pickerFramebuffer.setDepthRenderbuffer(this.gl, this.pickerDepthRenderbuffer.renderbuffer);

			// depth map for shadowing
			this.lightDepthMapTexture = new d3.Texture();
			this.lightDepthMapRenderbuffer = new d3.Renderbuffer();
			this.lightDepthMapFramebuffer = new d3.Framebuffer();
			this.lightDepthMapFramebuffer.init(this.gl);
			
			if(this.gl.depthTextureExt) {
				this.lightDepthMapTexture.init(this.gl, this.gl.UNSIGNED_SHORT, this.gl.DEPTH_COMPONENT);
				this.lightDepthMapRenderbuffer.init(this.gl, this.gl.RGBA4);
				this.lightDepthMapFramebuffer.setColorRenderbuffer(this.gl, this.lightDepthMapRenderbuffer.renderbuffer);
				this.lightDepthMapFramebuffer.setDepthTexture(this.gl, this.lightDepthMapTexture.texture);
			} else {
				this.lightDepthMapTexture.init(this.gl, this.gl.UNSIGNED_BYTE, this.gl.RGBA, this.gl.RGBA);
				this.lightDepthMapRenderbuffer.init(this.gl, this.gl.DEPTH_COMPONENT16);
				this.lightDepthMapFramebuffer.setColorTexture(this.gl, this.lightDepthMapTexture.texture);
				this.lightDepthMapFramebuffer.setDepthRenderbuffer(this.gl, this.lightDepthMapRenderbuffer.renderbuffer);
			}

			// deferred shading textures, renderbuffers, framebuffers and shaders
			if(this.isSupportDeferred()) {
				// g-buffer
				this.depthTexture = new d3.Texture();
				this.depthTexture.init(this.gl, this.gl.UNSIGNED_SHORT, this.gl.DEPTH_COMPONENT);

				this.colorTexture = new d3.Texture();
				this.colorTexture.init(this.gl, this.gl.UNSIGNED_BYTE, this.gl.RGBA);

				this.positionTexture = new d3.Texture();
				this.positionTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

				this.normalTexture = new d3.Texture();
				this.normalTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

				// postprocesing effect
				// ssao
				this.ssaoTexture = new d3.Texture();
				this.ssaoTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

				// outline
				this.outlineTexture = new d3.Texture();
				this.outlineTexture.init(this.gl, this.gl.UNSIGNED_BYTE, this.gl.RGBA);

				this.fxaaTexture = new d3.Texture();
				this.fxaaTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

				// temp texture
				this.imageTexture = new d3.Texture();
				this.imageTexture.init(this.gl, this.gl.FLOAT, this.gl.RGBA);

				// framebuffer
				this.colorFramebuffer = new d3.Framebuffer();
				this.colorFramebuffer.init(this.gl);
				this.colorFramebuffer.setColorTexture(this.gl, this.colorTexture.texture);
				this.colorFramebuffer.setDepthTexture(this.gl, this.depthTexture.texture);

				this.normalFramebuffer = new d3.Framebuffer();
				this.normalFramebuffer.init(this.gl);
				this.normalFramebuffer.setColorTexture(this.gl, this.normalTexture.texture);
				this.normalFramebuffer.setDepthTexture(this.gl, this.depthTexture.texture);

				this.positionFramebuffer = new d3.Framebuffer();
				this.positionFramebuffer.init(this.gl);
				this.positionFramebuffer.setColorTexture(this.gl, this.positionTexture.texture);
				this.positionFramebuffer.setDepthTexture(this.gl, this.depthTexture.texture);

				this.ssaoFramebuffer = new d3.Framebuffer();
				this.ssaoFramebuffer.init(this.gl);
				this.ssaoFramebuffer.setColorTexture(this.gl, this.ssaoTexture.texture);

				this.outlineFramebuffer = new d3.Framebuffer();
				this.outlineFramebuffer.init(this.gl);
				this.outlineFramebuffer.setColorTexture(this.gl, this.outlineTexture.texture);

				this.fxaaFramebuffer = new d3.Framebuffer();
				this.fxaaFramebuffer.init(this.gl);
				this.fxaaFramebuffer.setColorTexture(this.gl, this.fxaaTexture.texture);

				this.quadFramebuffer = new d3.Framebuffer();
				this.quadFramebuffer.init(this.gl);
				this.quadFramebuffer.setColorTexture(this.gl, this.imageTexture.texture);

				this.finalFramebuffer = new d3.Framebuffer();
				this.finalFramebuffer.init(this.gl);
				this.finalFramebuffer.setColorTexture(this.gl, this.fxaaTexture.texture);
				this.finalFramebuffer.setDepthTexture(this.gl, this.depthTexture.texture);

				this.normalShader = new d3.NormalShader();
				this.normalShader.init(this.gl);

				this.positionShader = new d3.PositionShader();
				this.positionShader.init(this.gl);

				if(d3.SSAOShader){
					this.ssaoShader = new d3.SSAOShader();
					this.ssaoShader.init(this.gl);
	
					this.ssaoBlurShader = new d3.SSAOBlurShader();
					this.ssaoBlurShader.init(this.gl);
				}

				this.outlineShader = new d3.OutlineShader();
				this.outlineShader.init(this.gl);

				this.lightingShader = new d3.LightingShader();
				this.lightingShader.init(this.gl);

				this.fxaaShader = new d3.FXAAShader();
				this.fxaaShader.init(this.gl);

				this.quadShader = new d3.QuadShader();
				this.quadShader.init(this.gl);
			}

			// this is the shaders
			this.labelShader = new d3.LabelShader();
			this.labelShader.init(this.gl);

			this.pickShader = new d3.PickShader();
			this.pickShader.init(this.gl);

			this.phongShader = new d3.PhongShader();
			this.phongShader.init(this.gl);

			if(d3.DepthShader){
				this.depthShader = new d3.DepthShader();
				this.depthShader.init(this.gl);
			}

			this.textTextImage = new d3.TextImage();
			this.textTextImage.init(this.gl);

			this.gl.textImage = new d3.TextImage();
			this.gl.textImage.init(this.gl);

			this.gl.textMesh = new d3.TextMesh();
			this.gl.textMesh.init(this.gl);

			// set up material
			this.gl.material = new d3.Material();

			this.setupScene();
		} else {
			this.displayMessage();
		}
	};
	_.displayMessage = function() {
		var canvas = document.getElementById(this.id);
		if (canvas.getContext) {
			var ctx = canvas.getContext('2d');
			if (this.specs.backgroundColor) {
				ctx.fillStyle = this.specs.backgroundColor;
				ctx.fillRect(0, 0, this.width, this.height);
			}
			if (this.emptyMessage) {
				ctx.fillStyle = '#737683';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.font = '18px Helvetica, Verdana, Arial, Sans-serif';
				ctx.fillText(this.emptyMessage, this.width / 2, this.height / 2);
			}
		}
	};
	_.renderText = function(text, position) {
		var vertexData = {
			position : [],
			texCoord : [],
			translation : []
		};
		this.textTextImage.pushVertexData(text, position, 0, vertexData);
		this.gl.textMesh.storeData(this.gl, vertexData.position, vertexData.texCoord, vertexData.translation);
		
		this.textTextImage.useTexture(this.gl);
		this.gl.textMesh.render(this.gl);
	};
	_.setupScene = function() {
		if (this.gl) {
			// clear the canvas
			// set background color for IE's sake, seems like an IE bug where half the repaints don't render a background
			var jqCapsule = q('#' + this.id);
			jqCapsule.css('background-color', this.specs.backgroundColor);
			var cs = math.getRGB(this.specs.backgroundColor, 1);
			this.gl.clearColor(cs[0], cs[1], cs[2], 1.0);
			this.specs.cullBackFace_3D ? this.gl.enable(this.gl.CULL_FACE) : this.gl.disable(this.gl.CULL_FACE);
			// here is the sphere buffer to be drawn, make it once, then scale
			// and translate to draw atoms
			this.gl.sphereBuffer = new d3.Sphere(1, this.specs.atoms_resolution_3D, this.specs.atoms_resolution_3D);
			this.gl.starBuffer = new d3.Star();
			this.gl.cylinderBuffer = new d3.Cylinder(1, 1, this.specs.bonds_resolution_3D);
			this.gl.cylinderClosedBuffer = new d3.Cylinder(1, 1, this.specs.bonds_resolution_3D, true);
			this.gl.boxBuffer = new d3.Box(1, 1, 1);
			this.gl.pillBuffer = new d3.Pill(this.specs.bonds_pillDiameter_3D / 2, this.specs.bonds_pillHeight_3D, this.specs.bonds_pillLatitudeResolution_3D, this.specs.bonds_pillLongitudeResolution_3D);
			this.gl.lineBuffer = new d3.Line();
			this.gl.lineArrowBuffer = new d3.LineArrow();
			this.gl.arrowBuffer = new d3.Arrow(0.3, this.specs.compass_resolution_3D);
			this.gl.quadBuffer = new d3.Quad();
			// texture for rendering text
			this.gl.textImage.updateFont(this.gl, this.specs.text_font_size, this.specs.text_font_families, this.specs.text_font_bold, this.specs.text_font_italic, this.specs.text_font_stroke_3D);
			// set up lighting
			this.lighting.lightScene(this.specs.lightDiffuseColor_3D, this.specs.lightSpecularColor_3D, this.specs.lightDirection_3D);
			// set up fogging
			this.fogging.fogScene(this.specs.fog_color_3D || this.specs.backgroundColor, this.specs.fog_start_3D, this.specs.fog_end_3D, this.specs.fog_density_3D);
			// set up compass
			this.compass = new d3.Compass(this.gl, this.specs);

			// set texture and renderbuffer parameter
			this.lightDepthMapTexture.setParameter(this.gl, this.shadowTextureSize, this.shadowTextureSize);
			this.lightDepthMapRenderbuffer.setParameter(this.gl, this.shadowTextureSize, this.shadowTextureSize);

			this.pickerColorTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
			this.pickerDepthRenderbuffer.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
			
			if(this.isSupportDeferred()) {
				this.depthTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

				this.colorTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

				this.imageTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

				this.positionTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

				this.normalTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

				this.ssaoTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

				this.outlineTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

				this.fxaaTexture.setParameter(this.gl, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

				// set SSAO parameter
				this.ssao.initSampleKernel(this.specs.ssao_kernel_samples);

				this.ssao.initNoiseTexture(this.gl);
			}

			this.camera.updateProjectionMatrix(this.specs.projectionPerspective_3D);

			for ( var k = 0, kk = this.molecules.length; k < kk; k++) {
				var mol = this.molecules[k];
				if (!(mol.labelMesh instanceof d3.TextMesh)) {
					mol.labelMesh = new d3.TextMesh();
					mol.labelMesh.init(this.gl);
				}
				if (mol.chains) {
					mol.ribbons = [];
					mol.cartoons = [];
					mol.tubes = [];
					mol.pipePlanks = [];
					// set up ribbon diagram if available and not already setup
					for ( var j = 0, jj = mol.chains.length; j < jj; j++) {
						var rs = mol.chains[j];
						for ( var i = 0, ii = rs.length - 1; i < ii; i++) {
							rs[i].Test =i;
						}
						var isNucleotide = rs.length > 3 && RESIDUE[rs[3].name] && RESIDUE[rs[3].name].aminoColor === '#BEA06E';
						if (rs.length > 0 && !rs[0].lineSegments) {
							for ( var i = 0, ii = rs.length - 1; i < ii; i++) {
								rs[i].setup(rs[i + 1].cp1, isNucleotide ? 1 : this.specs.proteins_horizontalResolution);
							}
							if (!isNucleotide) {
								for ( var i = 1, ii = rs.length - 1; i < ii; i++) {
									// reverse guide points if carbonyl
									// orientation flips
									if (extensions.vec3AngleFrom(rs[i - 1].D, rs[i].D) > m.PI / 2) {
										rs[i].guidePointsSmall.reverse();
										rs[i].guidePointsLarge.reverse();
										v3.scale(rs[i].D, -1);
									}
								}
							}
							for ( var i = 2, ii = rs.length - 3; i < ii; i++) {
								// compute line segments
								rs[i].computeLineSegments(rs[i - 2], rs[i - 1], rs[i + 1], !isNucleotide, isNucleotide ? this.specs.nucleics_verticalResolution : this.specs.proteins_verticalResolution);
							}
							// remove unneeded dummies
							rs.pop();
							rs.pop();
							rs.pop();
							rs.shift();
							rs.shift();
						}
						// create the hsl color for the chain
						var rgb = math.hsl2rgb(jj === 1 ? .5 : j / jj, 1, .5);
						var chainColor = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
						rs.chainColor = chainColor;
						if (isNucleotide) {
							var t = new d3.Tube(rs, this.specs.nucleics_tubeThickness, this.specs.nucleics_tubeResolution_3D);
							t.chainColor = chainColor;
							mol.tubes.push(t);
						} else {
							var t = new d3.PipePlank(rs, this.specs);
							mol.pipePlanks.push(t);
							var res = rs.shift();
							var r = {
								front : new d3.Ribbon(rs, this.specs.proteins_ribbonThickness, false),
								back : new d3.Ribbon(rs, -this.specs.proteins_ribbonThickness, false)
							};
							r.front.chainColor = chainColor;
							r.back.chainColor = chainColor;
							mol.ribbons.push(r);
							var d = {
								front : new d3.Ribbon(rs, this.specs.proteins_ribbonThickness, true),
								back : new d3.Ribbon(rs, -this.specs.proteins_ribbonThickness, true)
							};
							d.front.chainColor = chainColor;
							d.back.chainColor = chainColor;
							mol.cartoons.push(d);
							rs.unshift(res);
						}
					}
				}
			}
			this.label3D.updateVerticesBuffer(this.gl, this.getMolecules(), this.specs);
			// the molecules in frame of MovieCanvas3D must be handled
			if (this instanceof c.MovieCanvas3D && this.frames) {
				for ( var i = 0, ii = this.frames.length; i < ii; i++) {
					var f = this.frames[i];
					for ( var j = 0, jj = f.mols.length; j < jj; j++) {
						var mol = f.mols[j];
						if (!(mol.labelMesh instanceof structures.d3.TextMesh)) {
							mol.labelMesh = new structures.d3.TextMesh();
							mol.labelMesh.init(this.gl);
						}
					}
					this.label3D.updateVerticesBuffer(this.gl, f.mols, this.specs);
				}
			}
		}
	};
	_.updateScene = function() {
		this.camera.updateProjectionMatrix(this.specs.projectionPerspective_3D);

		this.lighting.lightScene(this.specs.lightDiffuseColor_3D, this.specs.lightSpecularColor_3D, this.specs.lightDirection_3D);
		
		this.fogging.fogScene(this.specs.fog_color_3D || this.specs.backgroundColor, this.specs.fog_start_3D, this.specs.fog_end_3D, this.specs.fog_density_3D);
		
		this.repaint();
	};
	_.mousedown = function(e) {
		this.lastPoint = e.p;
	};
	_.mouseup = function(e) {
		this.lastPoint = undefined;
	};
	_.rightmousedown = function(e) {
		this.lastPoint = e.p;
	};
	_.drag = function(e) {
		if(this.lastPoint){
			if (c.monitor.ALT) {
				var t = new structures.Point(e.p.x, e.p.y);
				t.sub(this.lastPoint);
				var theta = this.camera.fieldOfView / 360 * m.PI;
				var tanTheta = m.tan(theta);
				var topScreen = this.height / 2 / this.camera.zoom;
				var nearScreen = topScreen / tanTheta;
				var nearRatio = this.camera.focalLength() / nearScreen;
				m4.translate(this.camera.viewMatrix, [ t.x * nearRatio, -t.y * nearRatio, 0 ]);
			} else {
				var difx = e.p.x - this.lastPoint.x;
				var dify = e.p.y - this.lastPoint.y;
				var rotation = m4.rotate(m4.identity([]), difx * m.PI / 180.0, [ 0, 1, 0 ]);
				m4.rotate(rotation, dify * m.PI / 180.0, [ 1, 0, 0 ]);
				this.rotationMatrix = m4.multiply(rotation, this.rotationMatrix);
			}
			this.lastPoint = e.p;
			this.repaint();
		}
	};
	_.mousewheel = function(e, delta) {
    	delta > 0 ? this.camera.zoomIn() : this.camera.zoomOut();
		this.updateScene();
	};
	_.multitouchmove = function(e, numFingers) {
		if (numFingers === 2) {
			if (this.lastPoint && this.lastPoint.multi) {
				var t = new structures.Point(e.p.x, e.p.y);
				t.sub(this.lastPoint);
				var theta = this.camera.fieldOfView / 360 * m.PI;
				var tanTheta = m.tan(theta);
				var topScreen = this.height / 2 / this.camera.zoom;
				var nearScreen = topScreen / tanTheta;
				var nearRatio = this.camera.focalLength() / nearScreen;
				m4.translate(this.camera.viewMatrix, [ t.x * nearRatio, -t.y * nearRatio, 0 ]);
				this.lastPoint = e.p;
				this.repaint();
			} else {
				this.lastPoint = e.p;
				this.lastPoint.multi = true;
			}
		}
	};
	_.gesturechange = function(e) {
		if (e.originalEvent.scale - this.lastPinchScale !== 0) {
			var minFov = 0.1;
			var maxFov = 179.9;
			var dz = -(e.originalEvent.scale / this.lastPinchScale - 1) * 30;
			if(isNaN(dz)){
				// this seems to happen on Android when using multiple fingers
				return;
			}
    		dz > 0 ? this.camera.zoomIn() : this.camera.zoomOut();
			this.updateScene();
			this.lastPinchScale = e.originalEvent.scale;
		}
		this.repaint();
	};
	_.gestureend = function(e) {
		this.lastPinchScale = 1;
		this.lastGestureRotate = 0;
	};

})(ChemDoodle, ChemDoodle.extensions, ChemDoodle.math, ChemDoodle.structures, ChemDoodle.structures.d3, ChemDoodle.RESIDUE, Math, document, ChemDoodle.lib.mat4, ChemDoodle.lib.mat3, ChemDoodle.lib.vec3, ChemDoodle.lib.jQuery, window);

(function(c, iChemLabs, q, document, undefined) {
	'use strict';
	c.MolGrabberCanvas3D = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
		var sb = [];
		sb.push('<br><input type="text" id="');
		sb.push(id);
		sb.push('_query" size="32" value="" />');
		sb.push('<br><nobr>');
		sb.push('<select id="');
		sb.push(id);
		sb.push('_select">');
		// sb.push('<option value="chemexper">ChemExper');
		// sb.push('<option value="chemspider">ChemSpider');
		sb.push('<option value="pubchem" selected>PubChem');
		sb.push('</select>');
		sb.push('<button id="');
		sb.push(id);
		sb.push('_submit">Show Molecule</button>');
		sb.push('</nobr>');
		document.writeln(sb.join(''));
		var self = this;
		q('#' + id + '_submit').click(function() {
			self.search();
		});
		q('#' + id + '_query').keypress(function(e) {
			if (e.which === 13) {
				self.search();
			}
		});
	};
	var _ = c.MolGrabberCanvas3D.prototype = new c._Canvas3D();
	_.setSearchTerm = function(term) {
		q('#' + this.id + '_query').val(term);
		this.search();
	};
	_.search = function() {
		var self = this;
		iChemLabs.getMoleculeFromDatabase(q('#' + this.id + '_query').val(), {
			database : q('#' + this.id + '_select').val(),
			dimension : 3
		}, function(mol) {
			self.loadMolecule(mol);
		});
	};

})(ChemDoodle, ChemDoodle.iChemLabs, ChemDoodle.lib.jQuery, document);
(function(c, structures, undefined) {
	'use strict';
	c.MovieCanvas3D = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
		this.frames = [];
	};
	c.MovieCanvas3D.PLAY_ONCE = 0;
	c.MovieCanvas3D.PLAY_LOOP = 1;
	c.MovieCanvas3D.PLAY_SPRING = 2;
	var _ = c.MovieCanvas3D.prototype = new c._Canvas3D();
	_.timeout = 50;
	_.frameNumber = 0;
	_.playMode = 2;
	_.reverse = false;
	_.startAnimation = c._AnimatorCanvas.prototype.startAnimation;
	_.stopAnimation = c._AnimatorCanvas.prototype.stopAnimation;
	_.isRunning = c._AnimatorCanvas.prototype.isRunning;
	_.dblclick = c.RotatorCanvas.prototype.dblclick;
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
		var p = new structures.Atom();
		var first = this.frames[0];
		for ( var j = 0, jj = first.mols.length; j < jj; j++) {
			p.add3D(first.mols[j].getCenter3D());
		}
		p.x /= first.mols.length;
		p.y /= first.mols.length;
		var center = new structures.Atom();
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

})(ChemDoodle, ChemDoodle.structures);

(function(c, m, m4, undefined) {
	'use strict';
	// keep these declaration outside the loop to avoid overhead
	var matrix = [];
	var xAxis = [ 1, 0, 0 ];
	var yAxis = [ 0, 1, 0 ];
	var zAxis = [ 0, 0, 1 ];

	c.RotatorCanvas3D = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	var _ = c.RotatorCanvas3D.prototype = new c._Canvas3D();
	_.timeout = 33;
	var increment = m.PI / 15;
	_.xIncrement = increment;
	_.yIncrement = increment;
	_.zIncrement = increment;
	_.startAnimation = c._AnimatorCanvas.prototype.startAnimation;
	_.stopAnimation = c._AnimatorCanvas.prototype.stopAnimation;
	_.isRunning = c._AnimatorCanvas.prototype.isRunning;
	_.dblclick = c.RotatorCanvas.prototype.dblclick;
	_.mousedown = undefined;
	_.rightmousedown = undefined;
	_.drag = undefined;
	_.mousewheel = undefined;
	_.nextFrame = function(delta) {
		if (this.molecules.length === 0 && this.shapes.length === 0) {
			this.stopAnimation();
			return;
		}
		m4.identity(matrix);
		var change = delta / 1000;
		m4.rotate(matrix, this.xIncrement * change, xAxis);
		m4.rotate(matrix, this.yIncrement * change, yAxis);
		m4.rotate(matrix, this.zIncrement * change, zAxis);
		m4.multiply(this.rotationMatrix, matrix);
	};

})(ChemDoodle, Math, ChemDoodle.lib.mat4);
(function(c, undefined) {
	'use strict';
	c.TransformCanvas3D = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	c.TransformCanvas3D.prototype = new c._Canvas3D();

})(ChemDoodle);
(function(c, undefined) {
	'use strict';
	c.ViewerCanvas3D = function(id, width, height) {
		if (id) {
			this.create(id, width, height);
		}
	};
	var _ = c.ViewerCanvas3D.prototype = new c._Canvas3D();
	_.mousedown = undefined;
	_.rightmousedown = undefined;
	_.drag = undefined;
	_.mousewheel = undefined;

})(ChemDoodle);

(function(c, extensions, math, document, undefined) {
	'use strict';
	function PeriodicCell(element, x, y, dimension) {
		this.element = element;
		this.x = x;
		this.y = y;
		this.dimension = dimension;
		this.allowMultipleSelections = false;
	}

	c.PeriodicTableCanvas = function(id, cellDimension) {
		this.padding = 5;
		if (id) {
			this.create(id, cellDimension * 18 + this.padding * 2, cellDimension * 10 + this.padding * 2);
		}
		this.cellDimension = cellDimension ? cellDimension : 20;
		this.setupTable();
		this.repaint();
	};
	var _ = c.PeriodicTableCanvas.prototype = new c._Canvas();
	_.loadMolecule = undefined;
	_.getMolecule = undefined;
	_.getHoveredElement = function() {
		if (this.hovered) {
			return this.hovered.element;
		}
		return undefined;
	};
	_.innerRepaint = function(ctx) {
		for ( var i = 0, ii = this.cells.length; i < ii; i++) {
			this.drawCell(ctx, this.specs, this.cells[i]);
		}
		if (this.hovered) {
			this.drawCell(ctx, this.specs, this.hovered);
		}
		if (this.selected) {
			this.drawCell(ctx, this.specs, this.selected);
		}
	};
	_.setupTable = function() {
		this.cells = [];
		var x = this.padding;
		var y = this.padding;
		var count = 0;
		for ( var i = 0, ii = c.SYMBOLS.length; i < ii; i++) {
			if (count === 18) {
				count = 0;
				y += this.cellDimension;
				x = this.padding;
			}
			var e = c.ELEMENT[c.SYMBOLS[i]];
			if (e.atomicNumber === 2) {
				x += 16 * this.cellDimension;
				count += 16;
			} else if (e.atomicNumber === 5 || e.atomicNumber === 13) {
				x += 10 * this.cellDimension;
				count += 10;
			}
			if ((e.atomicNumber < 58 || e.atomicNumber > 71 && e.atomicNumber < 90 || e.atomicNumber > 103) && e.atomicNumber <= 118) {
				this.cells.push(new PeriodicCell(e, x, y, this.cellDimension));
				x += this.cellDimension;
				count++;
			}
		}
		y += 2 * this.cellDimension;
		x = 3 * this.cellDimension + this.padding;
		for ( var i = 57; i < 104; i++) {
			var e = c.ELEMENT[c.SYMBOLS[i]];
			if (e.atomicNumber === 90) {
				y += this.cellDimension;
				x = 3 * this.cellDimension + this.padding;
			}
			if (e.atomicNumber >= 58 && e.atomicNumber <= 71 || e.atomicNumber >= 90 && e.atomicNumber <= 103) {
				this.cells.push(new PeriodicCell(e, x, y, this.cellDimension));
				x += this.cellDimension;
			}
		}
	};
	_.drawCell = function(ctx, specs, cell) {
		var radgrad = ctx.createRadialGradient(cell.x + cell.dimension / 3, cell.y + cell.dimension / 3, cell.dimension * 1.5, cell.x + cell.dimension / 3, cell.y + cell.dimension / 3, cell.dimension / 10);
		radgrad.addColorStop(0, '#000000');
		radgrad.addColorStop(.7, cell.element.jmolColor);
		radgrad.addColorStop(1, '#FFFFFF');
		ctx.fillStyle = radgrad;
		extensions.contextRoundRect(ctx, cell.x, cell.y, cell.dimension, cell.dimension, cell.dimension / 8);
		if (cell === this.hovered || cell === this.selected || cell.selected) {
			ctx.lineWidth = 2;
			ctx.strokeStyle = '#c10000';
			ctx.stroke();
			ctx.fillStyle = 'white';
		}
		ctx.fill();
		ctx.font = extensions.getFontString(specs.text_font_size, specs.text_font_families);
		ctx.fillStyle = specs.text_color;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(cell.element.symbol, cell.x + cell.dimension / 2, cell.y + cell.dimension / 2);
	};
	_.click = function(e) {
		if (this.hovered) {
			if(this.allowMultipleSelections){
				this.hovered.selected = !this.hovered.selected;
			}else{
				this.selected = this.hovered;
			}
			this.repaint();
		}
	};
	_.touchstart = function(e){
		// try to hover an element
		this.mousemove(e);
	};
	_.mousemove = function(e) {
		var x = e.p.x;
		var y = e.p.y;
		this.hovered = undefined;
		for ( var i = 0, ii = this.cells.length; i < ii; i++) {
			var c = this.cells[i];
			if (math.isBetween(x, c.x, c.x + c.dimension) && math.isBetween(y, c.y, c.y + c.dimension)) {
				this.hovered = c;
				break;
			}
		}
		this.repaint();
	};
	_.mouseout = function(e) {
		this.hovered = undefined;
		this.repaint();
	};

})(ChemDoodle, ChemDoodle.extensions, ChemDoodle.math, document);

(function(io, document, window, undefined) {
	'use strict';
	io.png = {};

	io.png.string = function(canvas) {
		// this will not work for WebGL canvases in some browsers
		// to fix that you need to set the "preserveDrawingBuffer" to true when
		// creating the WebGL context
		// note that this will cause performance issues on some platforms and is
		// therefore not done by default
		return document.getElementById(canvas.id).toDataURL('image/png');
	};

	io.png.open = function(canvas) {
		window.open(this.string(canvas));
	};

})(ChemDoodle.io, document, window);

(function(io, q, undefined) {
	'use strict';
	io.file = {};

	// this function will only work with files from the same origin it is being
	// called from, unless the receiving server supports XHR2
	io.file.content = function(url, callback) {
		q.get(url, '', callback);
	};

})(ChemDoodle.io, ChemDoodle.lib.jQuery);

(function(c, iChemLabs, io, structures, q, location, undefined) {
	'use strict';
	iChemLabs.SERVER_URL = 'https://ichemlabs.cloud.chemdoodle.com/icl_cdc_v070001/WebHQ';

	iChemLabs.inRelay = false;
	iChemLabs.asynchronous = true;

	iChemLabs.INFO = {
		userAgent : navigator.userAgent,
		v_cwc : c.getVersion(),
		v_jQuery : q.fn.jquery,
		v_jQuery_ui : (q.ui ? q.ui.version : 'N/A')
	};

	var JSON_INTERPRETER = new io.JSONInterpreter();
	var queue = new structures.Queue();

	iChemLabs._contactServer = function(call, content, options, callback, errorback) {
		if (this.inRelay) {
			queue.enqueue({
				'call' : call,
				'content' : content,
				'options' : options,
				'callback' : callback,
				'errorback' : errorback
			});
		} else {
			iChemLabs.inRelay = true;
			q.ajax({
				dataType : 'text',
				type : 'POST',
				data : JSON.stringify({
					'call' : call,
					'content' : content,
					'options' : options,
					'info' : iChemLabs.INFO
				}),
				url : this.SERVER_URL,
				success : function(data) {
					var o = JSON.parse(data);
					if (o.message) {
						alert(o.message);
					}
					iChemLabs.inRelay = false;
					if (callback && o.content && !o.stop) {
						callback(o.content);
					}
					if (o.stop && errorback) {
						errorback();
					}
					if(!queue.isEmpty()){
						var next = queue.dequeue();
						iChemLabs._contactServer(next.call, next.content, next.options, next.callback, next.errorback);
					}
				},
				error : function(xhr, status, error) {
					if(call!='checkForUpdates'){
						alert('Call failed. Please try again. If you continue to see this message, please contact iChemLabs customer support.');
					}
					iChemLabs.inRelay = false;
					if (errorback) {
						errorback();
					}
					if(!queue.isEmpty()){
						var next = queue.dequeue();
						iChemLabs._contactServer(next.call, next.content, next.options, next.callback, next.errorback);
					}
				},
				xhrFields : {
					withCredentials : true
				},
				async : iChemLabs.asynchronous
			});
		}
	};

	// undocumented, this call is for clients that have licensed cloud for their
	// own servers
	iChemLabs.authenticate = function(credential, options, callback, errorback) {
		this._contactServer('authenticate', {
			'credential' : credential
		}, options, function(content) {
			callback(content);
		}, errorback);
	};

	iChemLabs.calculate = function(mol, options, callback, errorback) {
		this._contactServer('calculate', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(content);
		}, errorback);
	};

	iChemLabs.createLewisDotStructure = function(mol, options, callback, errorback) {
		this._contactServer('createLewisDot', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(JSON_INTERPRETER.molFrom(content.mol));
		}, errorback);
	};

	iChemLabs.generateImage = function(mol, options, callback, errorback) {
		this._contactServer('generateImage', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(content.link);
		}, errorback);
	};

	iChemLabs.generateIUPACName = function(mol, options, callback, errorback) {
		this._contactServer('generateIUPACName', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(content.iupac);
		}, errorback);
	};

	iChemLabs.getAd = function(callback, errorback) {
		this._contactServer('getAd', {}, {}, function(content) {
			callback(content.image_url, content.target_url);
		}, errorback);
	};

	iChemLabs.getMoleculeFromContent = function(input, options, callback, errorback) {
		this._contactServer('getMoleculeFromContent', {
			'content' : input
		}, options, function(content) {
			var z = false;
			for ( var i = 0, ii = content.mol.a.length; i < ii; i++) {
				if (content.mol.a[i].z !== 0) {
					z = true;
					break;
				}
			}
			if (z) {
				for ( var i = 0, ii = content.mol.a.length; i < ii; i++) {
					content.mol.a[i].x /= 20;
					content.mol.a[i].y /= 20;
					content.mol.a[i].z /= 20;
				}
			}
			callback(JSON_INTERPRETER.molFrom(content.mol));
		}, errorback);
	};

	iChemLabs.getMoleculeFromDatabase = function(query, options, callback, errorback) {
		this._contactServer('getMoleculeFromDatabase', {
			'query' : query
		}, options, function(content) {
			if (options.dimension === 3) {
				for ( var i = 0, ii = content.mol.a.length; i < ii; i++) {
					content.mol.a[i].x /= 20;
					content.mol.a[i].y /= -20;
					content.mol.a[i].z /= 20;
				}
			}
			callback(JSON_INTERPRETER.molFrom(content.mol));
		}, errorback);
	};

	iChemLabs.getOptimizedPDBStructure = function(id, options, callback, errorback) {
		this._contactServer('getOptimizedPDBStructure', {
			'id' : id
		}, options, function(content) {
			var mol;
			if (content.mol) {
				mol = JSON_INTERPRETER.molFrom(content.mol);
			} else {
				mol = new structures.Molecule();
			}
			mol.chains = JSON_INTERPRETER.chainsFrom(content.ribbons);
			mol.fromJSON = true;
			callback(mol);
		}, errorback);
	};

	iChemLabs.getZeoliteFromIZA = function(query, options, callback, errorback) {
		this._contactServer('getZeoliteFromIZA', {
			'query' : query
		}, options, function(content) {
			callback(ChemDoodle.readCIF(content.cif, options.xSuper, options.ySuper, options.zSuper));
		}, errorback);
	};

	iChemLabs.isGraphIsomorphism = function(arrow, target, options, callback, errorback) {
		this._contactServer('isGraphIsomorphism', {
			'arrow' : JSON_INTERPRETER.molTo(arrow),
			'target' : JSON_INTERPRETER.molTo(target)
		}, options, function(content) {
			callback(content.value);
		}, errorback);
	};

	iChemLabs.isSubgraphIsomorphism = function(arrow, target, options, callback, errorback) {
		this._contactServer('isSubgraphIsomorphism', {
			'arrow' : JSON_INTERPRETER.molTo(arrow),
			'target' : JSON_INTERPRETER.molTo(target)
		}, options, function(content) {
			callback(content.value);
		}, errorback);
	};

	iChemLabs.isSupergraphIsomorphism = function(arrow, target, options, callback, errorback) {
		this._contactServer('isSupergraphIsomorphism', {
			'arrow' : JSON_INTERPRETER.molTo(arrow),
			'target' : JSON_INTERPRETER.molTo(target)
		}, options, function(content) {
			callback(content.value);
		}, errorback);
	};

	iChemLabs.getSimilarityMeasure = function(first, second, options, callback, errorback) {
		this._contactServer('getSimilarityMeasure', {
			'first' : JSON_INTERPRETER.molTo(first),
			'second' : JSON_INTERPRETER.molTo(second)
		}, options, function(content) {
			callback(content.value);
		}, errorback);
	};

	iChemLabs.kekulize = function(mol, options, callback, errorback) {
		this._contactServer('kekulize', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(JSON_INTERPRETER.molFrom(content.mol));
		}, errorback);
	};
	
	iChemLabs.mechanismMatch = function(arrow, targets, options, callback, errorback) {
		this._contactServer('matchMechanism', {
			'arrow' : arrow,
			'targets' : targets
		}, options, function(content) {
			callback(content);
		}, errorback);
	};

	iChemLabs.optimize = function(mol, options, callback, errorback) {
		this._contactServer('optimize', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			var optimized = JSON_INTERPRETER.molFrom(content.mol);
			if (options.dimension === 2) {
				for ( var i = 0, ii = optimized.atoms.length; i < ii; i++) {
					mol.atoms[i].x = optimized.atoms[i].x;
					mol.atoms[i].y = optimized.atoms[i].y;
				}
				callback();
			} else if (options.dimension === 3) {
				for ( var i = 0, ii = optimized.atoms.length; i < ii; i++) {
					optimized.atoms[i].x /= 20;
					optimized.atoms[i].y /= -20;
					optimized.atoms[i].z /= 20;
				}
				callback(optimized);
			}
		}, errorback);
	};

	iChemLabs.readIUPACName = function(iupac, options, callback, errorback) {
		this._contactServer('readIUPACName', {
			'iupac' : iupac
		}, options, function(content) {
			callback(JSON_INTERPRETER.molFrom(content.mol));
		}, errorback);
	};

	iChemLabs.readSMILES = function(smiles, options, callback, errorback) {
		this._contactServer('readSMILES', {
			'smiles' : smiles
		}, options, function(content) {
			callback(JSON_INTERPRETER.molFrom(content.mol));
		}, errorback);
	};

	iChemLabs.saveFile = function(mol, options, callback, errorback) {
		this._contactServer('saveFile', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(content.link);
		}, errorback);
	};

	iChemLabs.simulate13CNMR = function(mol, options, callback, errorback) {
		options.nucleus = 'C';
		options.isotope = 13;
		this._contactServer('simulateNMR', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(c.readJCAMP(content.jcamp));
		}, errorback);
	};

	iChemLabs.simulate1HNMR = function(mol, options, callback, errorback) {
		options.nucleus = 'H';
		options.isotope = 1;
		this._contactServer('simulateNMR', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(c.readJCAMP(content.jcamp));
		}, errorback);
	};

	iChemLabs.simulateMassParentPeak = function(mol, options, callback, errorback) {
		this._contactServer('simulateMassParentPeak', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(c.readJCAMP(content.jcamp));
		}, errorback);
	};

	iChemLabs.writeSMILES = function(mol, options, callback, errorback) {
		this._contactServer('writeSMILES', {
			'mol' : JSON_INTERPRETER.molTo(mol)
		}, options, function(content) {
			callback(content.smiles);
		}, errorback);
	};

	iChemLabs.version = function(options, callback, errorback) {
		this._contactServer('version', {}, options, function(content) {
			callback(content.value);
		}, errorback);
	};

	iChemLabs.checkForUpdates = function(options) {
		this._contactServer('checkForUpdates', {
			'value' : location.href
		}, options, function(content) {}, function(){});
	};


})(ChemDoodle, ChemDoodle.iChemLabs, ChemDoodle.io, ChemDoodle.structures, ChemDoodle.lib.jQuery, location);