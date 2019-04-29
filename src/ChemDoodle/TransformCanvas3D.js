import _Canvas3D from './_Canvas3D';

export default function TransformCanvas3D(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
};
TransformCanvas3D.prototype = new _Canvas3D();
