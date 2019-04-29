import _SpectrumCanvas from './_SpectrumCanvas';

export default function OverlayCanvas(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
};
var _ = OverlayCanvas.prototype = new _SpectrumCanvas();
_.overlaySpectra = [];
_.superRepaint = _.innerRepaint;
_.innerRepaint = function(ctx) {
	this.superRepaint(ctx);
	if (this.spectrum && this.spectrum.data.length > 0) {
		for ( var i = 0, ii = this.overlaySpectra.length; i < ii; i++) {
			var s = this.overlaySpectra[i];
			if (s && s.data.length > 0) {
				s.minX = this.spectrum.minX;
				s.maxX = this.spectrum.maxX;
				s.drawPlot(ctx, this.specs, this.width, this.height, this.spectrum.memory.offsetTop, this.spectrum.memory.offsetLeft, this.spectrum.memory.offsetBottom);
			}
		}
	}
};
_.addSpectrum = function(spectrum) {
	if (!this.spectrum) {
		this.spectrum = spectrum;
	} else {
		this.overlaySpectra.push(spectrum);
	}
};
