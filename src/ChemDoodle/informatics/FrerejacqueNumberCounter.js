import _Counter from './_Counter';
import NumberOfMoleculesCounter from './NumberOfMoleculesCounter';

export default function	FrerejacqueNumberCounter(molecule) {
  this.setMolecule(molecule);
};
var _ = FrerejacqueNumberCounter.prototype = new _Counter();
_.innerCalculate = function() {
  this.value = this.molecule.bonds.length - this.molecule.atoms.length + new NumberOfMoleculesCounter(this.molecule).value;
};
