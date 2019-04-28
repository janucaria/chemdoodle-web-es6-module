import { Bond } from '../structures';

export default function HydrogenDeducer() {
};
var _ = HydrogenDeducer.prototype;
_.removeHydrogens = function(molecule, removeStereo) {
	var atoms = [];
	var bonds = [];
	for ( var i = 0, ii = molecule.bonds.length; i < ii; i++) {
		var b = molecule.bonds[i];
		var save = b.a1.label !== 'H' && b.a2.label !== 'H';
		if(!save && (!removeStereo && b.stereo !== Bond.STEREO_NONE)){
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
