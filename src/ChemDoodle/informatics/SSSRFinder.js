import FrerejacqueNumberCounter from './FrerejacqueNumberCounter';
import EulerFacetRingFinder from './EulerFacetRingFinder';

export default function SSSRFinder(molecule) {
	this.rings = [];
	if (molecule.atoms.length > 0) {
		var frerejacqueNumber = new FrerejacqueNumberCounter(molecule).value;
		var all = new EulerFacetRingFinder(molecule).rings;
		all.sort(function(a, b) {
			return a.atoms.length - b.atoms.length;
		});
		for ( var i = 0, ii = molecule.bonds.length; i < ii; i++) {
			molecule.bonds[i].visited = false;
		}
		for ( var i = 0, ii = all.length; i < ii; i++) {
			var use = false;
			for ( var j = 0, jj = all[i].bonds.length; j < jj; j++) {
				if (!all[i].bonds[j].visited) {
					use = true;
					break;
				}
			}
			if (use) {
				for ( var j = 0, jj = all[i].bonds.length; j < jj; j++) {
					all[i].bonds[j].visited = true;
				}
				this.rings.push(all[i]);
			}
			if (this.rings.length === frerejacqueNumber) {
				break;
			}
		}
	}
};
