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
import * as io from './ChemDoodle/io';
import animations from './ChemDoodle/animations';
import featureDetection from './ChemDoodle/featureDetection';
import monitor from './ChemDoodle/monitor';
import iChemLabs from './ChemDoodle/iChemLabs';
import * as ChemDoodleWeb from './ChemDoodle';

export var ChemDoodle = ChemDoodleWeb;

ChemDoodle.iChemLabs = iChemLabs;

ChemDoodle.informatics = informatics;

ChemDoodle.io = io;

ChemDoodle.lib = lib;
ChemDoodle.notations = {};

ChemDoodle.structures = structures;

ChemDoodle.animations = animations;

ChemDoodle.extensions = extensions;

ChemDoodle.math = math;

ChemDoodle.featureDetection = featureDetection;

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

ChemDoodle.monitor = monitor;

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
