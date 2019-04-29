import _Interpreter from './_Interpreter';
import {
	Atom,
	Bond,
	Molecule
} from '../structures';
import { jQuery as q } from '../lib';

export default function CMLInterpreter() {
};
var _ = CMLInterpreter.prototype = new _Interpreter();
_.read = function(content) {
	var molecules = [];
	var xml = q.parseXML(content);
	// Possible for multiple CML tags to exist
	var allCml = q(xml).find('cml');
	for (var i = 0, ii = allCml.length; i < ii; i++){
		var allMolecules = q(allCml[i]).find('molecule');
		for (var j = 0, jj = allMolecules.length; j < jj; j++) {
			var currentMolecule = molecules[j] = new Molecule();
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
				currentAtom = molecules[j].atoms[k] = new Atom(label, x, y, z);
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
				var currentBond = molecules[j].bonds[k] = new Bond(a1, a2, order);
				// check stereo... only support W or H
				switch (currentCMLBond.find('bondStereo').text()) {
				case 'W':
					currentBond.stereo = Bond.STEREO_PROTRUDING;
					break;
				case 'H':
					currentBond.stereo = Bond.STEREO_RECESSED;
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
	