import _Interpreter from './_Interpreter';
import { SYMBOLS } from '../../ChemDoodle';
import { BondDeducer } from '../informatics';
import {
	Atom,
	Molecule
} from '../structures';
import { jQuery as q } from '../lib';

const trim = q.trim;

export default function XYZInterpreter() {
};
var _ = XYZInterpreter.prototype = new _Interpreter();
_.deduceCovalentBonds = true;
_.read = function(content) {
	var molecule = new Molecule();
	if (!content) {
		return molecule;
	}
	var lines = content.split('\n');

	var numAtoms = parseInt(trim(lines[0]));

	for ( var i = 0; i < numAtoms; i++) {
		var line = lines[i + 2];
		var tokens = line.split(/\s+/g);
		molecule.atoms[i] = new Atom(isNaN(tokens[0]) ? tokens[0] : SYMBOLS[parseInt(tokens[0]) - 1], parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
	}
	if (this.deduceCovalentBonds) {
		new BondDeducer().deduceCovalentBonds(molecule, 1);
	}
	return molecule;
};
