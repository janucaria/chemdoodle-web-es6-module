import _Canvas from './_Canvas';

export default function ViewerCanvas(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
};
ViewerCanvas.prototype = new _Canvas();