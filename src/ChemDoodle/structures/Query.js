import { getFontString } from '../extensions';

const extensions = { getFontString };
const m = Math;

var COMMA_SPACE_REGEX = /[ ,]+/;
var COMMA_DASH_REGEX = /\-+/;
var FONTS = [ 'Helvetica', 'Arial', 'Dialog' ];

export default function Query(type) {
  this.type = type;
  // atom properties
  this.elements = {v:[],not:false};
  this.charge = undefined;
  this.chirality = undefined;
  this.connectivity = undefined;
  this.connectivityNoH = undefined;
  this.hydrogens = undefined;
  this.saturation = undefined;
  // bond properties
  this.orders = {v:[],not:false};
  this.stereo = undefined;
  // generic properties
  this.aromatic = undefined;
  this.ringCount = undefined;
  // cache the string value
  this.cache = undefined;
};
Query.TYPE_ATOM = 0;
Query.TYPE_BOND = 1;
var _ = Query.prototype;
_.parseRange = function(range){
  var points = [];
  var splits = range.split(COMMA_SPACE_REGEX);
  for(var i = 0, ii = splits.length; i<ii; i++){
    var t = splits[i];
    var neg = false;
    var neg2 = false;
    if(t.charAt(0)==='-'){
      neg = true;
      t = t.substring(1);
    }
    if (t.indexOf('--')!=-1) {
      neg2 = true;
    }
    if (t.indexOf('-')!=-1) {
      var parts = t.split(COMMA_DASH_REGEX);
      var p = {x:parseInt(parts[0]) * (neg ? -1 : 1),y:parseInt(parts[1]) * (neg2 ? -1 : 1)};
      if (p.y < p.x) {
        var tmp = p.y;
        p.y = p.x;
        p.x = tmp;
      }
      points.push(p);
    } else {
      points.push({x:parseInt(t) * (neg ? -1 : 1)});
    }
  }
  return points;
};
_.draw = function(ctx, specs, pos) {
  if(!this.cache){
    this.cache = this.toString();
  }
  var top = this.cache;
  var bottom = undefined;
  var split = top.indexOf('(');
  if(split!=-1){
    top = this.cache.substring(0, split);
    bottom = this.cache.substring(split, this.cache.length);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = extensions.getFontString(12, FONTS, true, false);
  var tw = ctx.measureText(top).width;
  ctx.fillStyle = specs.backgroundColor;
  ctx.fillRect(pos.x-tw/2, pos.y-6, tw, 12);
  ctx.fillStyle = 'black';
  ctx.fillText(top, pos.x, pos.y);
  if(bottom){
    ctx.font = extensions.getFontString(10, FONTS, false, true);
    tw = ctx.measureText(bottom).width;
    ctx.fillStyle = specs.backgroundColor;
    ctx.fillRect(pos.x-tw/2, pos.y+6, tw, 11);
    ctx.fillStyle = 'black';
    ctx.fillText(bottom, pos.x, pos.y+11);
  }
};
_.outputRange = function(array){
  var comma = false;
  var sb = [];
  for(var i = 0, ii = array.length; i<ii; i++){
    if(comma){
      sb.push(',');
    }
    comma = true;
    var p = array[i];
    if(p.y){
      sb.push(p.x);
      sb.push('-');
      sb.push(p.y);
    }else{
      sb.push(p.x);
    }
  }
  return sb.join('');
};
_.toString = function() {
  var sb = [];
  var attributes = [];
  if(this.type===Query.TYPE_ATOM){
    if(!this.elements || this.elements.v.length===0){
      sb.push('[a]');
    }else{
      if(this.elements.not){
        sb.push('!');
      }
      sb.push('[');
      sb.push(this.elements.v.join(','));
      sb.push(']');
    }
    if(this.chirality){
      attributes.push((this.chirality.not?'!':'')+'@='+this.chirality.v);
    }
    if(this.aromatic){
      attributes.push((this.aromatic.not?'!':'')+'A');
    }
    if(this.charge){
      attributes.push((this.charge.not?'!':'')+'C='+this.outputRange(this.charge.v));
    }
    if(this.hydrogens){
      attributes.push((this.hydrogens.not?'!':'')+'H='+this.outputRange(this.hydrogens.v));
    }
    if(this.ringCount){
      attributes.push((this.ringCount.not?'!':'')+'R='+this.outputRange(this.ringCount.v));
    }
    if(this.saturation){
      attributes.push((this.saturation.not?'!':'')+'S');
    }
    if(this.connectivity){
      attributes.push((this.connectivity.not?'!':'')+'X='+this.outputRange(this.connectivity.v));
    }
    if(this.connectivityNoH){
      attributes.push((this.connectivityNoH.not?'!':'')+'x='+this.outputRange(this.connectivityNoH.v));
    }
  }else if(this.type===Query.TYPE_BOND){
    if(!this.orders || this.orders.v.length===0){
      sb.push('[a]');
    }else{
      if(this.orders.not){
        sb.push('!');
      }
      sb.push('[');
      sb.push(this.orders.v.join(','));
      sb.push(']');
    }
    if(this.stereo){
      attributes.push((this.stereo.not?'!':'')+'@='+this.stereo.v);
    }
    if(this.aromatic){
      attributes.push((this.aromatic.not?'!':'')+'A');
    }
    if(this.ringCount){
      attributes.push((this.ringCount.not?'!':'')+'R='+this.outputRange(this.ringCount.v));
    }
  }
  if(attributes.length>0){
    sb.push('(');
    sb.push(attributes.join(','));
    sb.push(')');
  }
  return sb.join('');
};
