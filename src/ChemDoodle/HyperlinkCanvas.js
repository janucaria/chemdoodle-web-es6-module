import _Canvas from './_Canvas';

export default function HyperlinkCanvas(id, width, height, urlOrFunction, color, size) {
	if (id) {
		this.create(id, width, height);
	}
	this.urlOrFunction = urlOrFunction;
	this.color = color ? color : 'blue';
	this.size = size ? size : 2;
};
var _ = HyperlinkCanvas.prototype = new _Canvas();
_.openInNewWindow = true;
_.hoverImage = undefined;
_.drawChildExtras = function(ctx) {
	if (this.e) {
		if (this.hoverImage) {
			ctx.drawImage(this.hoverImage, 0, 0);
		} else {
			ctx.strokeStyle = this.color;
			ctx.lineWidth = this.size * 2;
			ctx.strokeRect(0, 0, this.width, this.height);
		}
	}
};
_.setHoverImage = function(url) {
	this.hoverImage = new Image();
	this.hoverImage.src = url;
};
_.click = function(p) {
	this.e = undefined;
	this.repaint();
	if (this.urlOrFunction instanceof Function) {
		this.urlOrFunction();
	} else {
		if (this.openInNewWindow) {
			window.open(this.urlOrFunction);
		} else {
			location.href = this.urlOrFunction;
		}
	}
};
_.mouseout = function(e) {
	this.e = undefined;
	this.repaint();
};
_.mouseover = function(e) {
	this.e = e;
	this.repaint();
};
