import _Interpreter from './_Interpreter';
import * as extensions from '../extensions';
import {
  Atom,
  Bond,
  Molecule,
  d3
} from '../structures';
import { mat4 as m4 } from '../lib';
import { BondDeducer } from '../informatics';
const m = Math;

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

export default function CIFInterpreter() {
};
var _ = CIFInterpreter.prototype = new _Interpreter();
_.read = function(content, xSuper, ySuper, zSuper) {
  xSuper = xSuper ? xSuper : 1;
  ySuper = ySuper ? ySuper : 1;
  zSuper = zSuper ? zSuper : 1;
  var molecule = new Molecule();
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
      var a = new Atom(tokens[labelIndex === -1 ? altLabelIndex : labelIndex].split(digitsSymbolRegex)[0], parseFloat(tokens[xIndex]), parseFloat(tokens[yIndex]), parseFloat(tokens[zIndex]));
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
        var copy1 = new Atom(a.label, x, y, z);
        add.push(copy1);
        // cifID could be 0, so check for undefined
        if (a.cifId !== undefined) {
          copy1.cifId = a.cifId;
          copy1.cifPart = i + 1;
        }
        if (impliedTranslations) {
          for ( var k = 0, kk = impliedTranslations.length; k < kk; k++) {
            var trans = impliedTranslations[k];
            var copy2 = new Atom(a.label, x + trans[0], y + trans[1], z + trans[2]);
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
            var copy = new Atom(a.label, a.x + i, a.y + j, a.z + k);
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
            molecule.bonds.push(new Bond(ai, aj));
          }
        }
      }
    }
  } else {
    new BondDeducer().deduceCovalentBonds(molecule, 1);
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
