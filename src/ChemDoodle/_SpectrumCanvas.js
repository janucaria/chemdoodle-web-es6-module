import _Canvas from './_Canvas';

export default function _SpectrumCanvas(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
};
var _ = _SpectrumCanvas.prototype = new _Canvas();
_.spectrum = undefined;
_.emptyMessage = 'No Spectrum Loaded or Recognized';
_.loadMolecule = undefined;
_.getMolecule = undefined;
_.innerRepaint = function(ctx) {
	if (this.spectrum && this.spectrum.data.length > 0) {
		this.spectrum.draw(ctx, this.specs, this.width, this.height);
	} else if (this.emptyMessage) {
		ctx.fillStyle = '#737683';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = '18px Helvetica, Verdana, Arial, Sans-serif';
		ctx.fillText(this.emptyMessage, this.width / 2, this.height / 2);
	}
};
_.loadSpectrum = function(spectrum) {
	this.spectrum = spectrum;
	this.repaint();
};
_.getSpectrum = function() {
	return this.spectrum;
};
_.getSpectrumCoordinates = function(x, y) {
	return spectrum.getInternalCoordinates(x, y, this.width, this.height);
};
