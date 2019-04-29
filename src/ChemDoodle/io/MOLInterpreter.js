import _Interpreter from './_Interpreter';
import {
	ELEMENT,
	default_bondLength_2D
} from '../../ChemDoodle';
import {
	Atom,
	Bond,
	Molecule
} from '../structures';

export default function MOLInterpreter() {
};
var _ = MOLInterpreter.prototype = new _Interpreter();
_.read = function(content, multiplier) {
	if (!multiplier) {
		multiplier = default_bondLength_2D;
	}
	var molecule = new Molecule();
	if (!content) {
		return molecule;
	}
	var currentTagTokens = content.split('\n');

	var counts = currentTagTokens[3];
	var numAtoms = parseInt(counts.substring(0, 3));
	var numBonds = parseInt(counts.substring(3, 6));

	for ( var i = 0; i < numAtoms; i++) {
		var line = currentTagTokens[4 + i];
		molecule.atoms[i] = new Atom(line.substring(31, 34), parseFloat(line.substring(0, 10)) * multiplier, (multiplier === 1 ? 1 : -1) * parseFloat(line.substring(10, 20)) * multiplier, parseFloat(line.substring(20, 30)) * multiplier);
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
		var b = new Bond(molecule.atoms[parseInt(line.substring(0, 3)) - 1], molecule.atoms[parseInt(line.substring(3, 6)) - 1], bondOrder);
		switch (stereo) {
		case 3:
			b.stereo = Bond.STEREO_AMBIGUOUS;
			break;
		case 1:
			b.stereo = Bond.STEREO_PROTRUDING;
			break;
		case 6:
			b.stereo = Bond.STEREO_RECESSED;
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
		sb.push(this.fit(((a.x - p.x) / default_bondLength_2D).toFixed(4), 10));
		sb.push(this.fit((-(a.y - p.y) / default_bondLength_2D).toFixed(4), 10));
		sb.push(this.fit((a.z / default_bondLength_2D).toFixed(4), 10));
		sb.push(' ');
		sb.push(this.fit(a.label, 3, true));
		sb.push(mass);
		sb.push(charge);
		sb.push('  0  0  0  0\n');
	}
	for ( var i = 0, ii = molecule.bonds.length; i < ii; i++) {
		var b = molecule.bonds[i];
		var stereo = 0;
		if (b.stereo === Bond.STEREO_AMBIGUOUS) {
			stereo = 3;
		} else if (b.stereo === Bond.STEREO_PROTRUDING) {
			stereo = 1;
		} else if (b.stereo === Bond.STEREO_RECESSED) {
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
