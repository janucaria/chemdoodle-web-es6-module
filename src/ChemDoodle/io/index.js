import { jQuery as q } from '../lib';

export { default as _Interpreter } from './_Interpreter';
export { default as JSONInterpreter } from './JSONInterpreter';
export { default as CIFInterpreter } from './CIFInterpreter';
export { default as CMLInterpreter } from './CMLInterpreter';
export { default as MOLInterpreter } from './MOLInterpreter';
export { default as PDBInterpreter } from './PDBInterpreter';
export { default as JCAMPInterpreter } from './JCAMPInterpreter';
export { default as RXNInterpreter } from './RXNInterpreter';
export { default as XYZInterpreter } from './XYZInterpreter';

export const png = {
  string(canvas) {
		// this will not work for WebGL canvases in some browsers
		// to fix that you need to set the "preserveDrawingBuffer" to true when
		// creating the WebGL context
		// note that this will cause performance issues on some platforms and is
		// therefore not done by default
		return document.getElementById(canvas.id).toDataURL('image/png');
  },
  open(canvas) {
		window.open(this.string(canvas));
  }
};

export const file = {
	// this function will only work with files from the same origin it is being
  // called from, unless the receiving server supports XHR2
  content(url, callback) {
		q.get(url, '', callback);
	}
};
