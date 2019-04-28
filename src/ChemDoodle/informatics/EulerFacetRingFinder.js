import _RingFinder from './_RingFinder';
import Ring from '../structures/Ring';

function Finger(a, from) {
	this.atoms = [];
	if (from) {
		for ( var i = 0, ii = from.atoms.length; i < ii; i++) {
			this.atoms[i] = from.atoms[i];
		}
	}
	this.atoms.push(a);
}
var _2 = Finger.prototype;
_2.grow = function(bonds, blockers) {
	var last = this.atoms[this.atoms.length - 1];
	var neighs = [];
	for ( var i = 0, ii = bonds.length; i < ii; i++) {
		if (bonds[i].contains(last)) {
			var neigh = bonds[i].getNeighbor(last);
			if (blockers.indexOf(neigh) === -1) {
				neighs.push(neigh);
			}
		}
	}
	var returning = [];
	for ( var i = 0, ii = neighs.length; i < ii; i++) {
		returning.push(new Finger(neighs[i], this));
	}
	return returning;
};
_2.check = function(bonds, finger, a) {
	// check that they dont contain similar parts
	for ( var i = 0, ii = finger.atoms.length - 1; i < ii; i++) {
		if (this.atoms.indexOf(finger.atoms[i]) !== -1) {
			return undefined;
		}
	}
	var ring;
	// check if fingers meet at tips
	if (finger.atoms[finger.atoms.length - 1] === this.atoms[this.atoms.length - 1]) {
		ring = new Ring();
		ring.atoms[0] = a;
		for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
			ring.atoms.push(this.atoms[i]);
		}
		for ( var i = finger.atoms.length - 2; i >= 0; i--) {
			ring.atoms.push(finger.atoms[i]);
		}
	} else {
		// check if fingers meet at bond
		var endbonds = [];
		for ( var i = 0, ii = bonds.length; i < ii; i++) {
			if (bonds[i].contains(finger.atoms[finger.atoms.length - 1])) {
				endbonds.push(bonds[i]);
			}
		}
		for ( var i = 0, ii = endbonds.length; i < ii; i++) {
			if ((finger.atoms.length === 1 || !endbonds[i].contains(finger.atoms[finger.atoms.length - 2])) && endbonds[i].contains(this.atoms[this.atoms.length - 1])) {
				ring = new Ring();
				ring.atoms[0] = a;
				for ( var j = 0, jj = this.atoms.length; j < jj; j++) {
					ring.atoms.push(this.atoms[j]);
				}
				for ( var j = finger.atoms.length - 1; j >= 0; j--) {
					ring.atoms.push(finger.atoms[j]);
				}
				break;
			}
		}
	}
	return ring;
};

export default function EulerFacetRingFinder(molecule) {
	this.setMolecule(molecule);
};
var _ = EulerFacetRingFinder.prototype = new _RingFinder();
_.fingerBreak = 5;
_.innerGetRings = function() {
	for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
		var neigh = [];
		for ( var j = 0, jj = this.bonds.length; j < jj; j++) {
			if (this.bonds[j].contains(this.atoms[i])) {
				neigh.push(this.bonds[j].getNeighbor(this.atoms[i]));
			}
		}
		for ( var j = 0, jj = neigh.length; j < jj; j++) {
			// weird that i can't optimize this loop without breaking a test
			// case...
			for ( var k = j + 1; k < neigh.length; k++) {
				var fingers = [];
				fingers[0] = new Finger(neigh[j]);
				fingers[1] = new Finger(neigh[k]);
				var blockers = [];
				blockers[0] = this.atoms[i];
				for ( var l = 0, ll = neigh.length; l < ll; l++) {
					if (l !== j && l !== k) {
						blockers.push(neigh[l]);
					}
				}
				var found = [];
				// check for 3 membered ring
				var three = fingers[0].check(this.bonds, fingers[1], this.atoms[i]);
				if (three) {
					found[0] = three;
				}
				while (found.length === 0 && fingers.length > 0 && fingers[0].atoms.length < this.fingerBreak) {
					var newfingers = [];
					for ( var l = 0, ll = fingers.length; l < ll; l++) {
						var adding = fingers[l].grow(this.bonds, blockers);
						for ( var m = 0, mm = adding.length; m < mm; m++) {
							newfingers.push(adding[m]);
						}
					}
					fingers = newfingers;
					for ( var l = 0, ll = fingers.length; l < ll; l++) {
						for ( var m = l + 1; m < ll; m++) {
							var r = fingers[l].check(this.bonds, fingers[m], this.atoms[i]);
							if (r) {
								found.push(r);
							}
						}
					}
					if (found.length === 0) {
						var newBlockers = [];
						for ( var l = 0, ll = blockers.length; l < ll; l++) {
							for ( var m = 0, mm = this.bonds.length; m < mm; m++) {
								if (this.bonds[m].contains(blockers[l])) {
									var neigh = this.bonds[m].getNeighbor(blockers[l]);
									if (blockers.indexOf(neigh) === -1 && newBlockers.indexOf(neigh) === -1) {
										newBlockers.push(neigh);
									}
								}
							}
						}
						for ( var l = 0, ll = newBlockers.length; l < ll; l++) {
							blockers.push(newBlockers[l]);
						}
					}
				}
				if (found.length > 0) {
					// this undefined is required...weird, don't know why
					var use = undefined;
					for ( var l = 0, ll = found.length; l < ll; l++) {
						if (!use || use.atoms.length > found[l].atoms.length) {
							use = found[l];
						}
					}
					var already = false;
					for ( var l = 0, ll = this.rings.length; l < ll; l++) {
						var all = true;
						for ( var m = 0, mm = use.atoms.length; m < mm; m++) {
							if (this.rings[l].atoms.indexOf(use.atoms[m]) === -1) {
								all = false;
								break;
							}
						}
						if (all) {
							already = true;
							break;
						}
					}
					if (!already) {
						this.rings.push(use);
					}
				}
			}
		}
	}
	this.fuse();
};
