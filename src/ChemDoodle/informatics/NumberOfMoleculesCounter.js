import _Counter from './_Counter';
import Queue from '../structures/Queue';

export default function NumberOfMoleculesCounter(molecule) {
  this.setMolecule(molecule);
};
var _ = NumberOfMoleculesCounter.prototype = new _Counter();
_.innerCalculate = function() {
  for ( var i = 0, ii = this.molecule.atoms.length; i < ii; i++) {
    this.molecule.atoms[i].visited = false;
  }
  for ( var i = 0, ii = this.molecule.atoms.length; i < ii; i++) {
    if (!this.molecule.atoms[i].visited) {
      this.value++;
      var q = new Queue();
      this.molecule.atoms[i].visited = true;
      q.enqueue(this.molecule.atoms[i]);
      while (!q.isEmpty()) {
        var atom = q.dequeue();
        for ( var j = 0, jj = this.molecule.bonds.length; j < jj; j++) {
          var b = this.molecule.bonds[j];
          if (b.contains(atom)) {
            var neigh = b.getNeighbor(atom);
            if (!neigh.visited) {
              neigh.visited = true;
              q.enqueue(neigh);
            }
          }
        }
      }
    }
  }
};