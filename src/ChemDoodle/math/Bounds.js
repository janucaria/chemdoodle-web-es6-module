const m = Math;

export default function Bounds() {
};
var _ = Bounds.prototype;
_.minX = _.minY = _.minZ = Infinity;
_.maxX = _.maxY = _.maxZ = -Infinity;
_.expand = function(x1, y1, x2, y2) {
  if (x1 instanceof Bounds) {
    // only need to compare min and max since bounds already has
    // them ordered
    this.minX = m.min(this.minX, x1.minX);
    this.minY = m.min(this.minY, x1.minY);
    this.maxX = m.max(this.maxX, x1.maxX);
    this.maxY = m.max(this.maxY, x1.maxY);
    if(x1.maxZ!==Infinity){
      this.minZ = m.min(this.minZ, x1.minZ);
      this.maxZ = m.max(this.maxZ, x1.maxZ);
    }
  } else {
    this.minX = m.min(this.minX, x1);
    this.maxX = m.max(this.maxX, x1);
    this.minY = m.min(this.minY, y1);
    this.maxY = m.max(this.maxY, y1);
    // these two values could be 0, so check if undefined
    if (x2 !== undefined && y2 !== undefined) {
      this.minX = m.min(this.minX, x2);
      this.maxX = m.max(this.maxX, x2);
      this.minY = m.min(this.minY, y2);
      this.maxY = m.max(this.maxY, y2);
    }
  }
};
_.expand3D = function(x1, y1, z1, x2, y2, z2) {
  this.minX = m.min(this.minX, x1);
  this.maxX = m.max(this.maxX, x1);
  this.minY = m.min(this.minY, y1);
  this.maxY = m.max(this.maxY, y1);
  this.minZ = m.min(this.minZ, z1);
  this.maxZ = m.max(this.maxZ, z1);
  // these two values could be 0, so check if undefined
  if (x2 !== undefined && y2 !== undefined && z2 !== undefined) {
    this.minX = m.min(this.minX, x2);
    this.maxX = m.max(this.maxX, x2);
    this.minY = m.min(this.minY, y2);
    this.maxY = m.max(this.maxY, y2);
    this.minZ = m.min(this.minZ, z2);
    this.maxZ = m.max(this.maxZ, z2);
  }
};