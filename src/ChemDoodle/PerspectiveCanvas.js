import _SpectrumCanvas from './_SpectrumCanvas';
import monitor from './monitor';
import { Point } from './structures';

const m = Math;

export default function PerspectiveCanvas(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
};
var _ = PerspectiveCanvas.prototype = new _SpectrumCanvas();
_.dragRange = undefined;
_.rescaleYAxisOnZoom = true;
_.lastPinchScale = 1;
_.mousedown = function(e) {
	this.dragRange = new Point(e.p.x, e.p.x);
};
_.mouseup = function(e) {
	if (this.dragRange && this.dragRange.x !== this.dragRange.y) {
		if (!this.dragRange.multi) {
			var newScale = this.spectrum.zoom(this.dragRange.x, e.p.x, this.width, this.rescaleYAxisOnZoom);
			if (this.rescaleYAxisOnZoom) {
				this.specs.scale = newScale;
			}
		}
		this.dragRange = undefined;
		this.repaint();
	}
};
_.drag = function(e) {
	if (this.dragRange) {
		if (this.dragRange.multi) {
			this.dragRange = undefined;
		} else if (monitor.SHIFT) {
			this.spectrum.translate(e.p.x - this.dragRange.x, this.width);
			this.dragRange.x = e.p.x;
			this.dragRange.y = e.p.x;
		} else {
			this.dragRange.y = e.p.x;
		}
		this.repaint();
	}
};
_.drawChildExtras = function(ctx) {
	if (this.dragRange) {
		var xs = m.min(this.dragRange.x, this.dragRange.y);
		var xe = m.max(this.dragRange.x, this.dragRange.y);
		ctx.strokeStyle = 'gray';
		ctx.lineStyle = 1;
		ctx.beginPath();
		ctx.moveTo(xs, this.height / 2);
		for ( var i = xs; i <= xe; i++) {
			if (i % 10 < 5) {
				ctx.lineTo(i, m.round(this.height / 2));
			} else {
				ctx.moveTo(i, m.round(this.height / 2));
			}
		}
		ctx.stroke();
	}
};
_.mousewheel = function(e, delta) {
	this.specs.scale += delta / 10;
	if (this.specs.scale < .01) {
		this.specs.scale = .01;
	}
	this.repaint();
};
_.dblclick = function(e) {
	this.spectrum.setup();
	this.specs.scale = 1;
	this.repaint();
};
_.multitouchmove = function(e, numFingers) {
	if (numFingers === 2) {
		if (!this.dragRange || !this.dragRange.multi) {
			this.dragRange = new Point(e.p.x, e.p.x);
			this.dragRange.multi = true;
		} else {
			this.spectrum.translate(e.p.x - this.dragRange.x, this.width);
			this.dragRange.x = e.p.x;
			this.dragRange.y = e.p.x;
			this.repaint();
		}
	}
};
_.gesturechange = function(e) {
	this.specs.scale *= e.originalEvent.scale / this.lastPinchScale;
	if (this.specs.scale < .01) {
		this.specs.scale = .01;
	}
	this.lastPinchScale = e.originalEvent.scale;
	this.repaint();
};
_.gestureend = function(e) {
	this.lastPinchScale = 1;
};
