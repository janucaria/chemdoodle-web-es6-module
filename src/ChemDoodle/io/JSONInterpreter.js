import {
  Query,
  Point,
  Atom,
  Bond,
  Residue,
  Molecule,
  d2,
  d3
} from '../structures';

export default function JSONInterpreter() {
};
var _ = JSONInterpreter.prototype;
_.contentTo = function(mols, shapes) {
  if(!mols){mols = [];}
  if(!shapes){shapes = [];}
  var count1 = 0, count2 = 0;
  for ( var i = 0, ii = mols.length; i < ii; i++) {
    var mol = mols[i];
    for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
      mol.atoms[j].tmpid = 'a' + count1++;
    }
    for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
      mol.bonds[j].tmpid = 'b' + count2++;
    }
  }
  count1 = 0;
  for ( var i = 0, ii = shapes.length; i < ii; i++) {
    shapes[i].tmpid = 's' + count1++;
  }
  var dummy = {};
  if (mols && mols.length > 0) {
    dummy.m = [];
    for ( var i = 0, ii = mols.length; i < ii; i++) {
      dummy.m.push(this.molTo(mols[i]));
    }
  }
  if (shapes && shapes.length > 0) {
    dummy.s = [];
    for ( var i = 0, ii = shapes.length; i < ii; i++) {
      dummy.s.push(this.shapeTo(shapes[i]));
    }
  }
  for ( var i = 0, ii = mols.length; i < ii; i++) {
    var mol = mols[i];
    for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
      mol.atoms[j].tmpid = undefined;
    }
    for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
      mol.bonds[j].tmpid = undefined;
    }
  }
  for ( var i = 0, ii = shapes.length; i < ii; i++) {
    shapes[i].tmpid = undefined;
  }
  return dummy;
};
_.contentFrom = function(dummy) {
  var obj = {
    molecules : [],
    shapes : []
  };
  if (dummy.m) {
    for ( var i = 0, ii = dummy.m.length; i < ii; i++) {
      obj.molecules.push(this.molFrom(dummy.m[i]));
    }
  }
  if (dummy.s) {
    for ( var i = 0, ii = dummy.s.length; i < ii; i++) {
      obj.shapes.push(this.shapeFrom(dummy.s[i], obj.molecules));
    }
  }
  for ( var i = 0, ii = obj.molecules.length; i < ii; i++) {
    var mol = obj.molecules[i];
    for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
      mol.atoms[j].tmpid = undefined;
    }
    for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
      mol.bonds[j].tmpid = undefined;
    }
  }
  for ( var i = 0, ii = obj.shapes.length; i < ii; i++) {
    obj.shapes[i].tmpid = undefined;
  }
  return obj;
};
_.queryTo = function(query) {
  var q = {};
  var appendProperty = function(q, p, name, isRange){
    if(p){
      q[name] = {v:isRange?query.outputRange(p.v):p.v, n:p.not};
    }
  };
  if(query.type===Query.TYPE_ATOM){
    appendProperty(q, query.elements, 'as');
    appendProperty(q, query.chirality, '@');
    appendProperty(q, query.aromatic, 'A');
    appendProperty(q, query.charge, 'C', true);
    appendProperty(q, query.hydrogens, 'H', true);
    appendProperty(q, query.ringCount, 'R', true);
    appendProperty(q, query.saturation, 'S');
    appendProperty(q, query.connectivity, 'X', true);
    appendProperty(q, query.connectivityNoH, 'x', true);
  }else{
    appendProperty(q, query.orders, 'bs');
    appendProperty(q, query.stereo, '@');
    appendProperty(q, query.aromatic, 'A');
    appendProperty(q, query.ringCount, 'R', true);
  }
  return q;
};
_.molTo = function(mol) {
  var dummy = {
    a : []
  };
  for ( var i = 0, ii = mol.atoms.length; i < ii; i++) {
    var a = mol.atoms[i];
    var da = {
      x : a.x,
      y : a.y
    };
    if (a.tmpid) {
      da.i = a.tmpid;
    }
    if (a.label !== 'C') {
      da.l = a.label;
    }
    if (a.z !== 0) {
      da.z = a.z;
    }
    if (a.charge !== 0) {
      da.c = a.charge;
    }
    if (a.mass !== -1) {
      da.m = a.mass;
    }
    if (a.implicitH !== -1) {
      da.h = a.implicitH;
    }
    if (a.numRadical !== 0) {
      da.r = a.numRadical;
    }
    if (a.numLonePair !== 0) {
      da.p = a.numLonePair;
    }
    if (a.query) {
      da.q = this.queryTo(a.query);
    }
    dummy.a.push(da);
  }
  if (mol.bonds.length > 0) {
    dummy.b = [];
    for ( var i = 0, ii = mol.bonds.length; i < ii; i++) {
      var b = mol.bonds[i];
      var db = {
        b : mol.atoms.indexOf(b.a1),
        e : mol.atoms.indexOf(b.a2)
      };
      if (b.tmpid) {
        db.i = b.tmpid;
      }
      if (b.bondOrder !== 1) {
        db.o = b.bondOrder;
      }
      if (b.stereo !== Bond.STEREO_NONE) {
        db.s = b.stereo;
      }
      if (b.query) {
        db.q = this.queryTo(b.query);
      }
      dummy.b.push(db);
    }
  }
  return dummy;
};
_.queryFrom = function(json) {
  var query = new Query(json.as?Query.TYPE_ATOM:Query.TYPE_BOND);
  var setupProperty = function(query, json, name, isRange){
    if(json){
      query[name] = {};
      query[name].v = isRange?query.parseRange(json.v):json.v;
      if(json.n){
        query[name].not = true;
      }
    }
  };
  if(query.type===Query.TYPE_ATOM){
    setupProperty(query, json.as, 'elements');
    setupProperty(query, json['@'], 'chirality');
    setupProperty(query, json.A, 'aromatic');
    setupProperty(query, json.C, 'charge', true);
    setupProperty(query, json.H, 'hydrogens', true);
    setupProperty(query, json.R, 'ringCount', true);
    setupProperty(query, json.S, 'saturation');
    setupProperty(query, json.X, 'connectivity', true);
    setupProperty(query, json.x, 'connectivityNoH', true);
  }else{
    setupProperty(query, json.bs, 'orders');
    setupProperty(query, json['@'], 'stereo');
    setupProperty(query, json.A, 'aromatic');
    setupProperty(query, json.R, 'ringCount', true);
  }
  return query;
};
_.molFrom = function(json) {
  var molecule = new Molecule();
  for ( var i = 0, ii = json.a.length; i < ii; i++) {
    var c = json.a[i];
    var a = new Atom(c.l ? c.l : 'C', c.x, c.y);
    if (c.i) {
      a.tmpid = c.i;
    }
    if (c.z) {
      a.z = c.z;
    }
    if (c.c) {
      a.charge = c.c;
    }
    if (c.m) {
      a.mass = c.m;
    }
    if (c.h) {
      a.implicitH = c.h;
    }
    if (c.r) {
      a.numRadical = c.r;
    }
    if (c.p) {
      a.numLonePair = c.p;
    }
    if(c.q){
      a.query = this.queryFrom(c.q);
    }
    // these are booleans or numbers, so check if undefined
    if (c.p_h !== undefined) {
      a.hetatm = c.p_h;
    }
    if (c.p_w !== undefined) {
      a.isWater = c.p_w;
    }
    if (c.p_d !== undefined) {
      a.closestDistance = c.p_d;
    }
    molecule.atoms.push(a);
  }
  if (json.b) {
    for ( var i = 0, ii = json.b.length; i < ii; i++) {
      var c = json.b[i];
      // order can be 0, so check against undefined
      var b = new Bond(molecule.atoms[c.b], molecule.atoms[c.e], c.o === undefined ? 1 : c.o);
      if (c.i) {
        b.tmpid = c.i;
      }
      if (c.s) {
        b.stereo = c.s;
      }
      if(c.q){
        b.query = this.queryFrom(c.q);
      }
      molecule.bonds.push(b);
    }
  }
  return molecule;
};
_.shapeTo = function(shape) {
  var dummy = {};
  if (shape.tmpid) {
    dummy.i = shape.tmpid;
  }
  if (shape instanceof d2.Line) {
    dummy.t = 'Line';
    dummy.x1 = shape.p1.x;
    dummy.y1 = shape.p1.y;
    dummy.x2 = shape.p2.x;
    dummy.y2 = shape.p2.y;
    dummy.a = shape.arrowType;
  } else if (shape instanceof d2.Pusher) {
    dummy.t = 'Pusher';
    dummy.o1 = shape.o1.tmpid;
    dummy.o2 = shape.o2.tmpid;
    if (shape.numElectron !== 1) {
      dummy.e = shape.numElectron;
    }
  } else if (shape instanceof d2.AtomMapping) {
    dummy.t = 'AtomMapping';
    dummy.a1 = shape.o1.tmpid;
    dummy.a2 = shape.o2.tmpid;
  } else if (shape instanceof d2.Bracket) {
    dummy.t = 'Bracket';
    dummy.x1 = shape.p1.x;
    dummy.y1 = shape.p1.y;
    dummy.x2 = shape.p2.x;
    dummy.y2 = shape.p2.y;
    if (shape.charge !== 0) {
      dummy.c = shape.charge;
    }
    if (shape.mult !== 0) {
      dummy.m = shape.mult;
    }
    if (shape.repeat !== 0) {
      dummy.r = shape.repeat;
    }
  } else if (shape instanceof d2.DynamicBracket) {
    dummy.t = 'DynamicBracket';
    dummy.b1 = shape.b1.tmpid;
    dummy.b2 = shape.b2.tmpid;
    dummy.n1 = shape.n1;
    dummy.n2 = shape.n2;
    if(shape.flip===true){
      dummy.f = true;
    }
  } else if (shape instanceof d2.VAP) {
    dummy.t = 'VAP';
    dummy.x = shape.asterisk.x;
    dummy.y = shape.asterisk.y;
    if(shape.bondType!==1){
      dummy.o = shape.bondType;
    }
    if(shape.substituent){
      dummy.s = shape.substituent.tmpid;
    }
    dummy.a = [];
    for(var i = 0, ii=shape.attachments.length; i<ii; i++){
      dummy.a.push(shape.attachments[i].tmpid);
    }
  } else if (shape instanceof d3.Distance) {
    dummy.t = 'Distance';
    dummy.a1 = shape.a1.tmpid;
    dummy.a2 = shape.a2.tmpid;
    if (shape.node) {
      dummy.n = shape.node;
      dummy.o = shape.offset;
    }
  } else if (shape instanceof d3.Angle) {
    dummy.t = 'Angle';
    dummy.a1 = shape.a1.tmpid;
    dummy.a2 = shape.a2.tmpid;
    dummy.a3 = shape.a3.tmpid;
  } else if (shape instanceof d3.Torsion) {
    dummy.t = 'Torsion';
    dummy.a1 = shape.a1.tmpid;
    dummy.a2 = shape.a2.tmpid;
    dummy.a3 = shape.a3.tmpid;
    dummy.a4 = shape.a4.tmpid;
  } else if (shape instanceof d3._Surface) {
    dummy.t = 'Surface';
    dummy.a = [];
    for(var i = 0, ii=shape.atoms.length; i<ii; i++){
      dummy.a.push(shape.atoms[i].tmpid);
    }
    if(!(shape instanceof d3.VDWSurface)){
      dummy.p = shape.probeRadius;
    }
    dummy.r = shape.resolution;
    var type = 'vdw';
    if(shape instanceof d3.SASSurface){
      type = 'sas';
    }else if(d3.SESSurface && shape instanceof d3.SESSurface){
      type = 'ses';
    }
    dummy.f = type;
  } else if (shape instanceof d3.UnitCell) {
    dummy.t = 'UnitCell';
    for (var p in shape.unitCell) {
          dummy[p] = shape.unitCell[p];
      }
  }
  return dummy;
};
_.shapeFrom = function(dummy, mols) {
  var shape;
  if (dummy.t === 'Line') {
    shape = new d2.Line(new Point(dummy.x1, dummy.y1), new Point(dummy.x2, dummy.y2));
    shape.arrowType = dummy.a;
  } else if (dummy.t === 'Pusher') {
    var o1, o2;
    for ( var i = 0, ii = mols.length; i < ii; i++) {
      var mol = mols[i];
      for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
        var a = mol.atoms[j];
        if (a.tmpid === dummy.o1) {
          o1 = a;
        } else if (a.tmpid === dummy.o2) {
          o2 = a;
        }
      }
      for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
        var b = mol.bonds[j];
        if (b.tmpid === dummy.o1) {
          o1 = b;
        } else if (b.tmpid === dummy.o2) {
          o2 = b;
        }
      }
    }
    shape = new d2.Pusher(o1, o2);
    if (dummy.e) {
      shape.numElectron = dummy.e;
    }
  } else if (dummy.t === 'AtomMapping') {
    var a1, a2;
    for ( var i = 0, ii = mols.length; i < ii; i++) {
      var mol = mols[i];
      for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
        var a = mol.atoms[j];
        if (a.tmpid === dummy.a1) {
          a1 = a;
        } else if (a.tmpid === dummy.a2) {
          a2 = a;
        }
      }
    }
    shape = new d2.AtomMapping(a1, a2);
  } else if (dummy.t === 'Bracket') {
    shape = new d2.Bracket(new Point(dummy.x1, dummy.y1), new Point(dummy.x2, dummy.y2));
    if (dummy.c !== undefined) {
      // have to check against undefined as it is an integer that can
      // be 0
      shape.charge = dummy.c;
    }
    if (dummy.m !== undefined) {
      // have to check against undefined as it is an integer that can
      // be 0
      shape.mult = dummy.m;
    }
    if (dummy.r !== undefined) {
      // have to check against undefined as it is an integer that can
      // be 0
      shape.repeat = dummy.r;
    }
  } else if (dummy.t === 'DynamicBracket') {
    var b1, b2;
    for ( var i = 0, ii = mols.length; i < ii; i++) {
      var mol = mols[i];
      for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
        var b = mol.bonds[j];
        if (b.tmpid === dummy.b1) {
          b1 = b;
        } else if (b.tmpid === dummy.b2) {
          b2 = b;
        }
      }
    }
    shape = new d2.DynamicBracket(b1, b2);
    shape.n1 = dummy.n1;
    shape.n2 = dummy.n2;
    if(dummy.f){
      shape.flip = true;
    }
  } else if (dummy.t === 'VAP') {
    shape = new d2.VAP(dummy.x, dummy.y);
    if(dummy.o){
      shape.bondType = dummy.o;
    }
    for ( var i = 0, ii = mols.length; i < ii; i++) {
      var mol = mols[i];
      for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
        var a = mol.atoms[j];
        if (a.tmpid === dummy.s) {
          shape.substituent = a;
        } else {
          for(var k = 0, kk = dummy.a.length; k<kk; k++){
            if(a.tmpid === dummy.a[k]){
              shape.attachments.push(a);
            }
          }
        }
      }
    }
  } else if (dummy.t === 'Distance') {
    var a1, a2;
    for ( var i = 0, ii = mols.length; i < ii; i++) {
      var mol = mols[i];
      for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
        var a = mol.atoms[j];
        if (a.tmpid === dummy.a1) {
          a1 = a;
        } else if (a.tmpid === dummy.a2) {
          a2 = a;
        }
      }
    }
    shape = new d3.Distance(a1, a2, dummy.n, dummy.o);
  } else if (dummy.t === 'Angle') {
    var a1, a2, a3;
    for ( var i = 0, ii = mols.length; i < ii; i++) {
      var mol = mols[i];
      for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
        var a = mol.atoms[j];
        if (a.tmpid === dummy.a1) {
          a1 = a;
        } else if (a.tmpid === dummy.a2) {
          a2 = a;
        } else if (a.tmpid === dummy.a3) {
          a3 = a;
        }
      }
    }
    shape = new d3.Angle(a1, a2, a3);
  } else if (dummy.t === 'Torsion') {
    var a1, a2, a3, a4;
    for ( var i = 0, ii = mols.length; i < ii; i++) {
      var mol = mols[i];
      for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
        var a = mol.atoms[j];
        if (a.tmpid === dummy.a1) {
          a1 = a;
        } else if (a.tmpid === dummy.a2) {
          a2 = a;
        } else if (a.tmpid === dummy.a3) {
          a3 = a;
        } else if (a.tmpid === dummy.a4) {
          a4 = a;
        }
      }
    }
    shape = new d3.Torsion(a1, a2, a3, a4);
  } else if (dummy.t === 'Surface') {
    var atoms = [];
    for ( var i = 0, ii = mols.length; i < ii; i++) {
      var mol = mols[i];
      for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
        var a = mol.atoms[j];
        for(var k = 0, kk = dummy.a.length; k<kk; k++){
          if(a.tmpid === dummy.a[k]){
            atoms.push(a);
          }
        }
      }
    }
    var probeRadius = dummy.p?dummy.p:1.4;
    var resolution = dummy.r?dummy.r:30;
    if(dummy.f==='vdw'){
      shape = new d3.VDWSurface(atoms, resolution);
    }else if(dummy.f==='sas'){
      shape = new d3.SASSurface(atoms, probeRadius, resolution);
    }else if(dummy.f==='ses'){
      shape = new d3.SESSurface(atoms, probeRadius, resolution);
    }
  } else if (dummy.t === 'UnitCell') {
    var unitCellVectors = {};
    for (var p in dummy) {
      unitCellVectors[p] = dummy[p];
      }
    shape = new d3.UnitCell(unitCellVectors);
  }
  return shape;
};
_.pdbFrom = function(content) {
  var mol = this.molFrom(content.mol);
  mol.findRings = false;
  // mark from JSON to note to algorithms that atoms in chain are not
  // same
  // objects as in atom array
  mol.fromJSON = true;
  mol.chains = this.chainsFrom(content.ribbons);
  return mol;
};
_.chainsFrom = function(content) {
  var chains = [];
  for ( var i = 0, ii = content.cs.length; i < ii; i++) {
    var chain = content.cs[i];
    var c = [];
    for ( var j = 0, jj = chain.length; j < jj; j++) {
      var convert = chain[j];
      var r = new Residue();
      r.name = convert.n;
      r.cp1 = new Atom('', convert.x1, convert.y1, convert.z1);
      r.cp2 = new Atom('', convert.x2, convert.y2, convert.z2);
      if (convert.x3) {
        r.cp3 = new Atom('', convert.x3, convert.y3, convert.z3);
        r.cp4 = new Atom('', convert.x4, convert.y4, convert.z4);
        r.cp5 = new Atom('', convert.x5, convert.y5, convert.z5);
      }
      r.helix = convert.h;
      r.sheet = convert.s;
      r.arrow = j > 0 && chain[j - 1].a;
      c.push(r);
    }
    chains.push(c);
  }
  return chains;
};
