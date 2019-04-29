import _Canvas3D from './_Canvas3D';

export default function ViewerCanvas3D(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
};
var _ = ViewerCanvas3D.prototype = new _Canvas3D();
_.mousedown = undefined;
_.rightmousedown = undefined;
_.drag = undefined;
_.mousewheel = undefined;
