import _SpectrumCanvas from './_SpectrumCanvas';

export default function ObserverCanvas(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
};
ObserverCanvas.prototype = new _SpectrumCanvas();
