export default function _Counter() {
};
var _ = _Counter.prototype;
_.value = 0;
_.molecule = undefined;
_.setMolecule = function(molecule) {
  this.value = 0;
  this.molecule = molecule;
  if (this.innerCalculate) {
    this.innerCalculate();
  }
};