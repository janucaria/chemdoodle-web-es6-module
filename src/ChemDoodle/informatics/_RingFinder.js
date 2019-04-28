export default function _RingFinder() {
};
var _ = _RingFinder.prototype;
_.atoms = undefined;
_.bonds = undefined;
_.rings = undefined;
_.reduce = function(molecule) {
  for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
    molecule.atoms[i].visited = false;
  }
  for ( var i = 0, ii = molecule.bonds.length; i < ii; i++) {
    molecule.bonds[i].visited = false;
  }
  var cont = true;
  while (cont) {
    cont = false;
    for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
      var count = 0;
      var bond;
      for ( var j = 0, jj = molecule.bonds.length; j < jj; j++) {
        if (molecule.bonds[j].contains(molecule.atoms[i]) && !molecule.bonds[j].visited) {
          count++;
          if (count === 2) {
            break;
          }
          bond = molecule.bonds[j];
        }
      }
      if (count === 1) {
        cont = true;
        bond.visited = true;
        molecule.atoms[i].visited = true;
      }
    }
  }
  for ( var i = 0, ii = molecule.atoms.length; i < ii; i++) {
    if (!molecule.atoms[i].visited) {
      this.atoms.push(molecule.atoms[i]);
    }
  }
  for ( var i = 0, ii = molecule.bonds.length; i < ii; i++) {
    if (!molecule.bonds[i].visited) {
      this.bonds.push(molecule.bonds[i]);
    }
  }
  if (this.bonds.length === 0 && this.atoms.length !== 0) {
    this.atoms = [];
  }
};
_.setMolecule = function(molecule) {
  this.atoms = [];
  this.bonds = [];
  this.rings = [];
  this.reduce(molecule);
  if (this.atoms.length > 2 && this.innerGetRings) {
    this.innerGetRings();
  }
};
_.fuse = function() {
  for ( var i = 0, ii = this.rings.length; i < ii; i++) {
    for ( var j = 0, jj = this.bonds.length; j < jj; j++) {
      if (this.rings[i].atoms.indexOf(this.bonds[j].a1) !== -1 && this.rings[i].atoms.indexOf(this.bonds[j].a2) !== -1) {
        this.rings[i].bonds.push(this.bonds[j]);
      }
    }
  }
};
