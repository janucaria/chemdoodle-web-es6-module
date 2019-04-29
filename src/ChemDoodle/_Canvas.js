import featureDetection from './featureDetection';
import * as math from './math';
import monitor from './monitor';
import {
  Point,
  VisualSpecifications
} from './structures';
import {
  jQuery as q
} from './lib';
import { _Canvas3D } from '../ChemDoodle';

const m = Math;
const userAgent = navigator.userAgent;

export default function _Canvas() {
};
var _ = _Canvas.prototype;
_.molecules = undefined;
_.shapes = undefined;
_.emptyMessage = undefined;
_.image = undefined;
_.repaint = function() {
  if (this.test) {
    return;
  }
  var canvas = document.getElementById(this.id);
  if (canvas.getContext) {
    var ctx = canvas.getContext('2d');
    if (this.pixelRatio !== 1 && canvas.width === this.width) {
      canvas.width = this.width * this.pixelRatio;
      canvas.height = this.height * this.pixelRatio;
      ctx.scale(this.pixelRatio, this.pixelRatio);
    }
    if (!this.image) {
      if (this.specs.backgroundColor && this.bgCache !== canvas.style.backgroundColor) {
        canvas.style.backgroundColor = this.specs.backgroundColor;
        this.bgCache = canvas.style.backgroundColor;
      }
      // clearRect is correct, but doesn't work as expected on Android
      // ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = this.specs.backgroundColor;
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      ctx.drawImage(this.image, 0, 0);
    }
    if (this.innerRepaint) {
      this.innerRepaint(ctx);
    } else {
      if (this.molecules.length !== 0 || this.shapes.length !== 0) {
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.rotate(this.specs.rotateAngle);
        ctx.scale(this.specs.scale, this.specs.scale);
        ctx.translate(-this.width / 2, -this.height / 2);
        for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
          this.molecules[i].check(true);
          this.molecules[i].draw(ctx, this.specs);
        }
        if(this.checksOnAction){
          // checksOnAction() must be called after checking molecules, as it depends on molecules being correct
          // this function is only used by the uis
          this.checksOnAction(true);
        }
        for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
          this.shapes[i].draw(ctx, this.specs);
        }
        ctx.restore();
      } else if (this.emptyMessage) {
        ctx.fillStyle = '#737683';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '18px Helvetica, Verdana, Arial, Sans-serif';
        ctx.fillText(this.emptyMessage, this.width / 2, this.height / 2);
      }
    }
    if (this.drawChildExtras) {
      this.drawChildExtras(ctx, this.specs);
    }
  }
};
_.resize = function(w, h) {
  var cap = q('#' + this.id);
  cap.attr({
    width : w,
    height : h
  });
  cap.css('width', w);
  cap.css('height', h);
  this.width = w;
  this.height = h;
  if (_Canvas3D && this instanceof _Canvas3D) {
    var wu = w;
    var hu = h;
    if (this.pixelRatio !== 1) {
      wu *= this.pixelRatio;
      hu *= this.pixelRatio;
      this.gl.canvas.width = wu;
      this.gl.canvas.height = hu;
    }
    this.gl.viewport(0, 0, wu, hu);
    this.afterLoadContent();
  } else if (this.molecules.length > 0) {
    this.center();
    for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
      this.molecules[i].check();
    }
  }
  this.repaint();
};
_.setBackgroundImage = function(path) {
  this.image = new Image(); // Create new Image object
  var me = this;
  this.image.onload = function() {
    me.repaint();
  };
  this.image.src = path; // Set source path
};
_.loadMolecule = function(molecule) {
  this.clear();
  this.molecules.push(molecule);
  // do this twice to center based on atom labels, which must be first rendered to be considered in bounds
  for(var i = 0; i<2; i++){
    this.center();
    if (!(_Canvas3D && this instanceof _Canvas3D)) {
      molecule.check();
    }
    if (this.afterLoadContent) {
      this.afterLoadContent();
    }
    this.repaint();
  }
};
_.loadContent = function(mols, shapes) {
  this.molecules = mols?mols:[];
  this.shapes = shapes?shapes:[];
  // do this twice to center based on atom labels, which must be first rendered to be considered in bounds
  for(var i = 0; i<2; i++){
    this.center();
    if (!(_Canvas3D && this instanceof _Canvas3D)) {
      for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
        this.molecules[i].check();
      }
    }
    if (this.afterLoadContent) {
      this.afterLoadContent();
    }
    this.repaint();
  }
};
_.addMolecule = function(molecule) {
  this.molecules.push(molecule);
  if (!(_Canvas3D && this instanceof _Canvas3D)) {
    molecule.check();
  }
  this.repaint();
};
_.removeMolecule = function(mol) {
  this.molecules = q.grep(this.molecules, function(value) {
    return value !== mol;
  });
  this.repaint();
};
_.getMolecule = function() {
  return this.molecules.length > 0 ? this.molecules[0] : undefined;
};
_.getMolecules = function() {
  return this.molecules;
};
_.addShape = function(shape) {
  this.shapes.push(shape);
  this.repaint();
};
_.removeShape = function(shape) {
  this.shapes = q.grep(this.shapes, function(value) {
    return value !== shape;
  });
  this.repaint();
};
_.getShapes = function() {
  return this.shapes;
};
_.clear = function() {
  this.molecules = [];
  this.shapes = [];
  this.specs.scale = 1;
  this.repaint();
};
_.center = function() {
  var bounds = this.getContentBounds();
  var center = new Point((this.width - bounds.minX - bounds.maxX) / 2, (this.height - bounds.minY - bounds.maxY) / 2);
  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    var mol = this.molecules[i];
    for ( var j = 0, jj = mol.atoms.length; j < jj; j++) {
      mol.atoms[j].add(center);
    }
  }
  for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
    var sps = this.shapes[i].getPoints();
    for ( var j = 0, jj = sps.length; j < jj; j++) {
      sps[j].add(center);
    }
  }
  this.specs.scale = 1;
  var difX = bounds.maxX - bounds.minX;
  var difY = bounds.maxY - bounds.minY;
  if (difX > this.width-20 || difY > this.height-20) {
    this.specs.scale = m.min(this.width / difX, this.height / difY) * .85;
  }
};
_.bondExists = function(a1, a2) {
  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    var mol = this.molecules[i];
    for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
      var b = mol.bonds[j];
      if (b.contains(a1) && b.contains(a2)) {
        return true;
      }
    }
  }
  return false;
};
_.getBond = function(a1, a2) {
  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    var mol = this.molecules[i];
    for ( var j = 0, jj = mol.bonds.length; j < jj; j++) {
      var b = mol.bonds[j];
      if (b.contains(a1) && b.contains(a2)) {
        return b;
      }
    }
  }
  return undefined;
};
_.getMoleculeByAtom = function(a) {
  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    var mol = this.molecules[i];
    if (mol.atoms.indexOf(a) !== -1) {
      return mol;
    }
  }
  return undefined;
};
_.getAllAtoms = function() {
  var as = [];
  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    as = as.concat(this.molecules[i].atoms);
  }
  return as;
};
_.getAllBonds = function() {
  var bs = [];
  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    bs = bs.concat(this.molecules[i].bonds);
  }
  return bs;
};
_.getAllPoints = function() {
  var ps = [];
  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    ps = ps.concat(this.molecules[i].atoms);
  }
  for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
    ps = ps.concat(this.shapes[i].getPoints());
  }
  return ps;
};
_.getContentBounds = function() {
  var bounds = new math.Bounds();
  for ( var i = 0, ii = this.molecules.length; i < ii; i++) {
    bounds.expand(this.molecules[i].getBounds());
  }
  for ( var i = 0, ii = this.shapes.length; i < ii; i++) {
    bounds.expand(this.shapes[i].getBounds());
  }
  return bounds;
};
_.create = function(id, width, height) {
  this.id = id;
  this.width = width;
  this.height = height;
  this.molecules = [];
  this.shapes = [];
  if (document.getElementById(id)) {
    var canvas = q('#' + id);
    if (!width) {
      this.width = canvas.attr('width');
    } else {
      canvas.attr('width', width);
    }
    if (!height) {
      this.height = canvas.attr('height');
    } else {
      canvas.attr('height', height);
    }
    // If the canvas is pre-created, make sure that the class attribute
    // is specified.
    canvas.attr('class', 'ChemDoodleWebComponent');
  } else if (!featureDetection.supports_canvas_text() && userAgent.indexOf("MSIE") != -1) {
    // Install Google Chrome Frame
    document.writeln('<div style="border: 1px solid black;" width="' + width + '" height="' + height + '">Please install <a href="http://code.google.com/chrome/chromeframe/">Google Chrome Frame</a>, then restart Internet Explorer.</div>');
    return;
  } else {
    document.writeln('<canvas class="ChemDoodleWebComponent" id="' + id + '" width="' + width + '" height="' + height + '" alt="ChemDoodle Web Component">This browser does not support HTML5/Canvas.</canvas>');
  }
  var jqCapsule = q('#' + id);
  jqCapsule.css('width', this.width);
  jqCapsule.css('height', this.height);
  this.pixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
  this.specs = new VisualSpecifications();
  // setup input events
  // make sure prehandle events are only in if statements if handled, so
  // as not to block browser events
  var me = this;
  if (featureDetection.supports_touch()) {
    // for iPhone OS and Android devices (and other mobile browsers that
    // support mobile events)
    jqCapsule.bind('touchstart', function(e) {
      var time = new Date().getTime();
      if (!featureDetection.supports_gesture() && e.originalEvent.touches.length === 2) {
        // on some platforms, like Android, there is no gesture
        // support, so we have to implement it
        var ts = e.originalEvent.touches;
        var p1 = new Point(ts[0].pageX, ts[0].pageY);
        var p2 = new Point(ts[1].pageX, ts[1].pageY);
        me.implementedGestureDist = p1.distance(p2);
        me.implementedGestureAngle = p1.angle(p2);
        if (me.gesturestart) {
          me.prehandleEvent(e);
          me.gesturestart(e);
        }
      }
      if (me.lastTouch && e.originalEvent.touches.length === 1 && (time - me.lastTouch) < 500) {
        if (me.dbltap) {
          me.prehandleEvent(e);
          me.dbltap(e);
        } else if (me.dblclick) {
          me.prehandleEvent(e);
          me.dblclick(e);
        } else if (me.touchstart) {
          me.prehandleEvent(e);
          me.touchstart(e);
        } else if (me.mousedown) {
          me.prehandleEvent(e);
          me.mousedown(e);
        }
      } else if (me.touchstart) {
        me.prehandleEvent(e);
        me.touchstart(e);
        if (this.hold) {
          clearTimeout(this.hold);
        }
        if (this.touchhold) {
          this.hold = setTimeout(function() {
            me.touchhold(e);
          }, 1000);
        }
      } else if (me.mousedown) {
        me.prehandleEvent(e);
        me.mousedown(e);
      }
      me.lastTouch = time;
    });
    jqCapsule.bind('touchmove', function(e) {
      if (this.hold) {
        clearTimeout(this.hold);
        this.hold = undefined;
      }
      if (!featureDetection.supports_gesture() && e.originalEvent.touches.length === 2) {
        // on some platforms, like Android, there is no gesture
        // support, so we have to implement it
        if (me.gesturechange) {
          var ts = e.originalEvent.touches;
          var p1 = new Point(ts[0].pageX, ts[0].pageY);
          var p2 = new Point(ts[1].pageX, ts[1].pageY);
          var newDist = p1.distance(p2);
          var newAngle = p1.angle(p2);
          e.originalEvent.scale = newDist / me.implementedGestureDist;
          e.originalEvent.rotation = 180 * (me.implementedGestureAngle - newAngle) / m.PI;
          me.prehandleEvent(e);
          me.gesturechange(e);
        }
      }
      if (e.originalEvent.touches.length > 1 && me.multitouchmove) {
        var numFingers = e.originalEvent.touches.length;
        me.prehandleEvent(e);
        var center = new Point(-e.offset.left * numFingers, -e.offset.top * numFingers);
        for ( var i = 0; i < numFingers; i++) {
          center.x += e.originalEvent.changedTouches[i].pageX;
          center.y += e.originalEvent.changedTouches[i].pageY;
        }
        center.x /= numFingers;
        center.y /= numFingers;
        e.p = center;
        me.multitouchmove(e, numFingers);
      } else if (me.touchmove) {
        me.prehandleEvent(e);
        me.touchmove(e);
      } else if (me.drag) {
        me.prehandleEvent(e);
        me.drag(e);
      }
    });
    jqCapsule.bind('touchend', function(e) {
      if (this.hold) {
        clearTimeout(this.hold);
        this.hold = undefined;
      }
      if (!featureDetection.supports_gesture() && me.implementedGestureDist) {
        // on some platforms, like Android, there is no gesture
        // support, so we have to implement it
        me.implementedGestureDist = undefined;
        me.implementedGestureAngle = undefined;
        if (me.gestureend) {
          me.prehandleEvent(e);
          me.gestureend(e);
        }
      }
      if (me.touchend) {
        me.prehandleEvent(e);
        me.touchend(e);
      } else if (me.mouseup) {
        me.prehandleEvent(e);
        me.mouseup(e);
      }
      if ((new Date().getTime() - me.lastTouch) < 250) {
        if (me.tap) {
          me.prehandleEvent(e);
          me.tap(e);
        } else if (me.click) {
          me.prehandleEvent(e);
          me.click(e);
        }
      }
    });
    jqCapsule.bind('gesturestart', function(e) {
      if (me.gesturestart) {
        me.prehandleEvent(e);
        me.gesturestart(e);
      }
    });
    jqCapsule.bind('gesturechange', function(e) {
      if (me.gesturechange) {
        me.prehandleEvent(e);
        me.gesturechange(e);
      }
    });
    jqCapsule.bind('gestureend', function(e) {
      if (me.gestureend) {
        me.prehandleEvent(e);
        me.gestureend(e);
      }
    });
  } else {
    // normal events
    // some mobile browsers will simulate mouse events, so do not set
    // these
    // events if mobile, or it will interfere with the handling of touch
    // events
    jqCapsule.click(function(e) {
      switch (e.which) {
      case 1:
        // left mouse button pressed
        if (me.click) {
          me.prehandleEvent(e);
          me.click(e);
        }
        break;
      case 2:
        // middle mouse button pressed
        if (me.middleclick) {
          me.prehandleEvent(e);
          me.middleclick(e);
        }
        break;
      case 3:
        // right mouse button pressed
        if (me.rightclick) {
          me.prehandleEvent(e);
          me.rightclick(e);
        }
        break;
      }
    });
    jqCapsule.dblclick(function(e) {
      if (me.dblclick) {
        me.prehandleEvent(e);
        me.dblclick(e);
      }
    });
    jqCapsule.mousedown(function(e) {
      switch (e.which) {
      case 1:
        // left mouse button pressed
        monitor.CANVAS_DRAGGING = me;
        if (me.mousedown) {
          me.prehandleEvent(e);
          me.mousedown(e);
        }
        break;
      case 2:
        // middle mouse button pressed
        if (me.middlemousedown) {
          me.prehandleEvent(e);
          me.middlemousedown(e);
        }
        break;
      case 3:
        // right mouse button pressed
        if (me.rightmousedown) {
          me.prehandleEvent(e);
          me.rightmousedown(e);
        }
        break;
      }
    });
    jqCapsule.mousemove(function(e) {
      if (!monitor.CANVAS_DRAGGING && me.mousemove) {
        me.prehandleEvent(e);
        me.mousemove(e);
      }
    });
    jqCapsule.mouseout(function(e) {
      monitor.CANVAS_OVER = undefined;
      if (me.mouseout) {
        me.prehandleEvent(e);
        me.mouseout(e);
      }
    });
    jqCapsule.mouseover(function(e) {
      monitor.CANVAS_OVER = me;
      if (me.mouseover) {
        me.prehandleEvent(e);
        me.mouseover(e);
      }
    });
    jqCapsule.mouseup(function(e) {
      switch (e.which) {
      case 1:
        // left mouse button pressed
        if (me.mouseup) {
          me.prehandleEvent(e);
          me.mouseup(e);
        }
        break;
      case 2:
        // middle mouse button pressed
        if (me.middlemouseup) {
          me.prehandleEvent(e);
          me.middlemouseup(e);
        }
        break;
      case 3:
        // right mouse button pressed
        if (me.rightmouseup) {
          me.prehandleEvent(e);
          me.rightmouseup(e);
        }
        break;
      }
    });
    jqCapsule.mousewheel(function(e, delta) {
      if (me.mousewheel) {
        me.prehandleEvent(e);
        me.mousewheel(e, delta);
      }
    });
  }
  if (this.subCreate) {
    this.subCreate();
  }
};
_.prehandleEvent = function(e) {
  if (e.originalEvent.changedTouches) {
    e.pageX = e.originalEvent.changedTouches[0].pageX;
    e.pageY = e.originalEvent.changedTouches[0].pageY;
  }
  if(!this.doEventDefault){
    e.preventDefault();
    e.returnValue = false;
  }
  e.offset = q('#' + this.id).offset();
  e.p = new Point(e.pageX - e.offset.left, e.pageY - e.offset.top);
};
