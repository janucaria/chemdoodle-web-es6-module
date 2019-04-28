import { Queue, Molecule } from '../structures';

export default function Splitter() {
};
var _ = Splitter.prototype;
_.split = function(molecule) {
  var mols = [];
  for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
    molecule.atoms[i].visited = false;
  }
  for ( var i = 0, ii = molecule.bonds.length; i < ii; i++) {
    molecule.bonds[i].visited = false;
  }
  for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
    var a = molecule.atoms[i];
    if (!a.visited) {
      var newMol = new Molecule();
      newMol.atoms.push(a);
      a.visited = true;
      var q = new Queue();
      q.enqueue(a);
      while (!q.isEmpty()) {
        var atom = q.dequeue();
        for ( var j = 0, jj = molecule.bonds.length; j < jj; j++) {
          var b = molecule.bonds[j];
          if (b.contains(atom) && !b.visited) {
            b.visited = true;
            newMol.bonds.push(b);
            var neigh = b.getNeighbor(atom);
            if (!neigh.visited) {
              neigh.visited = true;
              newMol.atoms.push(neigh);
              q.enqueue(neigh);
            }
          }
        }
      }
      mols.push(newMol);
    }
  }
  return mols;
};
