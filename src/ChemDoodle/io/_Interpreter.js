export default function _Interpreter() {
};
var _ = _Interpreter.prototype;
_.fit = function(data, length, leftAlign) {
	var size = data.length;
	var padding = [];
	for ( var i = 0; i < length - size; i++) {
		padding.push(' ');
	}
	return leftAlign ? data + padding.join('') : padding.join('') + data;
};
