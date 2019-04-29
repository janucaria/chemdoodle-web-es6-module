import _Canvas from './_Canvas';
import { SYMBOLS, ELEMENT } from '../ChemDoodle';
import * as extensions from './extensions';
import * as math from './math';

function PeriodicCell(element, x, y, dimension) {
	this.element = element;
	this.x = x;
	this.y = y;
	this.dimension = dimension;
	this.allowMultipleSelections = false;
}

export default function PeriodicTableCanvas(id, cellDimension) {
	this.padding = 5;
	if (id) {
		this.create(id, cellDimension * 18 + this.padding * 2, cellDimension * 10 + this.padding * 2);
	}
	this.cellDimension = cellDimension ? cellDimension : 20;
	this.setupTable();
	this.repaint();
};
var _ = PeriodicTableCanvas.prototype = new _Canvas();
_.loadMolecule = undefined;
_.getMolecule = undefined;
_.getHoveredElement = function() {
	if (this.hovered) {
		return this.hovered.element;
	}
	return undefined;
};
_.innerRepaint = function(ctx) {
	for ( var i = 0, ii = this.cells.length; i < ii; i++) {
		this.drawCell(ctx, this.specs, this.cells[i]);
	}
	if (this.hovered) {
		this.drawCell(ctx, this.specs, this.hovered);
	}
	if (this.selected) {
		this.drawCell(ctx, this.specs, this.selected);
	}
};
_.setupTable = function() {
	this.cells = [];
	var x = this.padding;
	var y = this.padding;
	var count = 0;
	for ( var i = 0, ii = SYMBOLS.length; i < ii; i++) {
		if (count === 18) {
			count = 0;
			y += this.cellDimension;
			x = this.padding;
		}
		var e = ELEMENT[SYMBOLS[i]];
		if (e.atomicNumber === 2) {
			x += 16 * this.cellDimension;
			count += 16;
		} else if (e.atomicNumber === 5 || e.atomicNumber === 13) {
			x += 10 * this.cellDimension;
			count += 10;
		}
		if ((e.atomicNumber < 58 || e.atomicNumber > 71 && e.atomicNumber < 90 || e.atomicNumber > 103) && e.atomicNumber <= 118) {
			this.cells.push(new PeriodicCell(e, x, y, this.cellDimension));
			x += this.cellDimension;
			count++;
		}
	}
	y += 2 * this.cellDimension;
	x = 3 * this.cellDimension + this.padding;
	for ( var i = 57; i < 104; i++) {
		var e = ELEMENT[SYMBOLS[i]];
		if (e.atomicNumber === 90) {
			y += this.cellDimension;
			x = 3 * this.cellDimension + this.padding;
		}
		if (e.atomicNumber >= 58 && e.atomicNumber <= 71 || e.atomicNumber >= 90 && e.atomicNumber <= 103) {
			this.cells.push(new PeriodicCell(e, x, y, this.cellDimension));
			x += this.cellDimension;
		}
	}
};
_.drawCell = function(ctx, specs, cell) {
	var radgrad = ctx.createRadialGradient(cell.x + cell.dimension / 3, cell.y + cell.dimension / 3, cell.dimension * 1.5, cell.x + cell.dimension / 3, cell.y + cell.dimension / 3, cell.dimension / 10);
	radgrad.addColorStop(0, '#000000');
	radgrad.addColorStop(.7, cell.element.jmolColor);
	radgrad.addColorStop(1, '#FFFFFF');
	ctx.fillStyle = radgrad;
	extensions.contextRoundRect(ctx, cell.x, cell.y, cell.dimension, cell.dimension, cell.dimension / 8);
	if (cell === this.hovered || cell === this.selected || cell.selected) {
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#c10000';
		ctx.stroke();
		ctx.fillStyle = 'white';
	}
	ctx.fill();
	ctx.font = extensions.getFontString(specs.text_font_size, specs.text_font_families);
	ctx.fillStyle = specs.text_color;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(cell.element.symbol, cell.x + cell.dimension / 2, cell.y + cell.dimension / 2);
};
_.click = function(e) {
	if (this.hovered) {
		if(this.allowMultipleSelections){
			this.hovered.selected = !this.hovered.selected;
		}else{
			this.selected = this.hovered;
		}
		this.repaint();
	}
};
_.touchstart = function(e){
	// try to hover an element
	this.mousemove(e);
};
_.mousemove = function(e) {
	var x = e.p.x;
	var y = e.p.y;
	this.hovered = undefined;
	for ( var i = 0, ii = this.cells.length; i < ii; i++) {
		var c = this.cells[i];
		if (math.isBetween(x, c.x, c.x + c.dimension) && math.isBetween(y, c.y, c.y + c.dimension)) {
			this.hovered = c;
			break;
		}
	}
	this.repaint();
};
_.mouseout = function(e) {
	this.hovered = undefined;
	this.repaint();
};
