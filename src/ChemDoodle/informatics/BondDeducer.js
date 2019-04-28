import {
  ELEMENT,
  default_bondLength_2D,
  default_angstromsPerBondLength
} from '../../ChemDoodle';
import { Bond } from '../structures';

export function getPointsPerAngstrom() {
  return default_bondLength_2D / default_angstromsPerBondLength;
};

export default function BondDeducer() {
};
var _ = BondDeducer.prototype;
_.margin = 1.1;
_.deduceCovalentBonds = function(molecule, customPointsPerAngstrom) {
  var pointsPerAngstrom = getPointsPerAngstrom();
  if (customPointsPerAngstrom) {
    pointsPerAngstrom = customPointsPerAngstrom;
  }
  for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
    for ( var j = i + 1; j < ii; j++) {
      var first = molecule.atoms[i];
      var second = molecule.atoms[j];
      if (first.distance3D(second) < (ELEMENT[first.label].covalentRadius + ELEMENT[second.label].covalentRadius) * pointsPerAngstrom * this.margin) {
        molecule.bonds.push(new Bond(first, second, 1));
      }
    }
  }
};
