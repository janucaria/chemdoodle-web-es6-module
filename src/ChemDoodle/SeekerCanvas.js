import _SpectrumCanvas from './_SpectrumCanvas';
import * as extensions from './extensions';

const m = Math;

export default function SeekerCanvas(id, width, height, seekType) {
	if (id) {
		this.create(id, width, height);
	}
	this.seekType = seekType;
};
var _ = SeekerCanvas.prototype = new _SpectrumCanvas();
_.superRepaint = _.innerRepaint;
_.innerRepaint = function(ctx) {
	this.superRepaint(ctx);
	if (this.spectrum && this.spectrum.data.length > 0 && this.p) {
		// set up coords
		var renderP;
		var internalP;
		if (this.seekType === SeekerCanvas.SEEK_POINTER) {
			renderP = this.p;
			internalP = this.spectrum.getInternalCoordinates(renderP.x, renderP.y);
		} else if (this.seekType === SeekerCanvas.SEEK_PLOT || this.seekType === SeekerCanvas.SEEK_PEAK) {
			internalP = this.seekType === SeekerCanvas.SEEK_PLOT ? this.spectrum.getClosestPlotInternalCoordinates(this.p.x) : this.spectrum.getClosestPeakInternalCoordinates(this.p.x);
			if (!internalP) {
				return;
			}
			renderP = {
				x : this.spectrum.getTransformedX(internalP.x, this.specs, this.width, this.spectrum.memory.offsetLeft),
				y : this.spectrum.getTransformedY(internalP.y / 100, this.specs, this.height, this.spectrum.memory.offsetBottom, this.spectrum.memory.offsetTop)
			};
		}
		// draw point
		ctx.fillStyle = 'white';
		ctx.strokeStyle = this.specs.plots_color;
		ctx.lineWidth = this.specs.plots_width;
		ctx.beginPath();
		ctx.arc(renderP.x, renderP.y, 3, 0, m.PI * 2, false);
		ctx.fill();
		ctx.stroke();
		// draw internal coordinates
		ctx.font = extensions.getFontString(this.specs.text_font_size, this.specs.text_font_families);
		ctx.textAlign = 'left';
		ctx.textBaseline = 'bottom';
		var s = 'x:' + internalP.x.toFixed(3) + ', y:' + internalP.y.toFixed(3);
		var x = renderP.x + 3;
		var w = ctx.measureText(s).width;
		if (x + w > this.width - 2) {
			x -= 6 + w;
		}
		var y = renderP.y;
		if (y - this.specs.text_font_size - 2 < 0) {
			y += this.specs.text_font_size;
		}
		ctx.fillRect(x, y - this.specs.text_font_size, w, this.specs.text_font_size);
		ctx.fillStyle = 'black';
		ctx.fillText(s, x, y);
	}
};
_.mouseout = function(e) {
	this.p = undefined;
	this.repaint();
};
_.mousemove = function(e) {
	this.p = {
		x : e.p.x - 2,
		y : e.p.y - 3
	};
	this.repaint();
};
_.touchstart = function(e) {
	this.mousemove(e);
};
_.touchmove = function(e) {
	this.mousemove(e);
};
_.touchend = function(e) {
	this.mouseout(e);
};
SeekerCanvas.SEEK_POINTER = 'pointer';
SeekerCanvas.SEEK_PLOT = 'plot';
SeekerCanvas.SEEK_PEAK = 'peak';
