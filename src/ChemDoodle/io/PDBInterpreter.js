import _Interpreter from './_Interpreter';
import * as extensions from '../extensions';
import { ELEMENT } from '../../ChemDoodle';
import { BondDeducer } from '../informatics';
import {
	Atom,
	Bond,
	Residue,
	Molecule
} from '../structures';
import { jQuery as q } from '../lib';
const m = Math;

const trim = q.trim;

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

export default function PDBInterpreter() {
};
var _ = PDBInterpreter.prototype = new _Interpreter();
_.calculateRibbonDistances = false;
_.deduceResidueBonds = false;
_.read = function(content, multiplier) {
	var molecule = new Molecule();
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
				var a = new Atom(label, parseFloat(line.substring(30, 38)) * multiplier, parseFloat(line.substring(38, 46)) * multiplier, parseFloat(line.substring(46, 54)) * multiplier);
				a.hetatm = false;
				resatoms.push(a);
				// set up residue
				var resSeq = parseInt(line.substring(22, 26));
				if (currentChain.length === 0) {
					for ( var j = 0; j < 3; j++) {
						var dummyFront = new Residue(-1);
						dummyFront.cp1 = a;
						dummyFront.cp2 = a;
						currentChain.push(dummyFront);
					}
				}
				if (resSeq !== Number.NaN && currentChain[currentChain.length - 1].resSeq !== resSeq) {
					var r = new Residue(resSeq);
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
			var het = new Atom(symbol, parseFloat(line.substring(30, 38)) * multiplier, parseFloat(line.substring(38, 46)) * multiplier, parseFloat(line.substring(46, 54)) * multiplier);
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
								molecule.bonds.push(new Bond(origin, a2));
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
		new BondDeducer().deduceCovalentBonds(molecule, multiplier);
	}
	if (this.deduceResidueBonds) {
		for ( var i = 0, ii = resatoms.length; i < ii; i++) {
			var max = m.min(ii, i + 20);
			for ( var j = i + 1; j < max; j++) {
				var first = resatoms[i];
				var second = resatoms[j];
				if (first.distance3D(second) < (ELEMENT[first.label].covalentRadius + ELEMENT[second.label].covalentRadius) * 1.1) {
					molecule.bonds.push(new Bond(first, second, 1));
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
			var dummyEnd = new Residue(-1);
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
