import Point from './Point';
const m = Math;

export default function Ring() {
  this.atoms = [];
  this.bonds = [];
};
var _ = Ring.prototype;
_.center = undefined;
_.setupBonds = function() {
  for ( var i = 0, ii = this.bonds.length; i < ii; i++) {
    this.bonds[i].ring = this;
  }
  this.center = this.getCenter();
};
_.getCenter = function() {
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for ( var i = 0, ii = this.atoms.length; i < ii; i++) {
    minX = m.min(this.atoms[i].x, minX);
    minY = m.min(this.atoms[i].y, minY);
    maxX = m.max(this.atoms[i].x, maxX);
    maxY = m.max(this.atoms[i].y, maxY);
  }
  return new Point((maxX + minX) / 2, (maxY + minY) / 2);
};
