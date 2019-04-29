import _Interpreter from './_Interpreter';
import * as extensions from '../extensions';
import {
	ViewerCanvas,
	ObserverCanvas
} from '../../ChemDoodle';
import {
	Point,
	Spectrum,
	Atom,
	Bond,
	Molecule
} from '../structures';

var SQZ_HASH = {
	'@' : 0,
	'A' : 1,
	'B' : 2,
	'C' : 3,
	'D' : 4,
	'E' : 5,
	'F' : 6,
	'G' : 7,
	'H' : 8,
	'I' : 9,
	'a' : -1,
	'b' : -2,
	'c' : -3,
	'd' : -4,
	'e' : -5,
	'f' : -6,
	'g' : -7,
	'h' : -8,
	'i' : -9
}, DIF_HASH = {
	'%' : 0,
	'J' : 1,
	'K' : 2,
	'L' : 3,
	'M' : 4,
	'N' : 5,
	'O' : 6,
	'P' : 7,
	'Q' : 8,
	'R' : 9,
	'j' : -1,
	'k' : -2,
	'l' : -3,
	'm' : -4,
	'n' : -5,
	'o' : -6,
	'p' : -7,
	'q' : -8,
	'r' : -9
}, DUP_HASH = {
	'S' : 1,
	'T' : 2,
	'U' : 3,
	'V' : 4,
	'W' : 5,
	'X' : 6,
	'Y' : 7,
	'Z' : 8,
	's' : 9
};

export default function JCAMPInterpreter() {
};
var _ = JCAMPInterpreter.prototype = new _Interpreter();
_.convertHZ2PPM = false;
_.read = function(content) {
	this.isBreak = function(c) {
		// some of these arrays may return zero, so check if undefined
		return SQZ_HASH[c] !== undefined || DIF_HASH[c] !== undefined || DUP_HASH[c] !== undefined || c === ' ' || c === '-' || c === '+';
	};
	this.getValue = function(decipher, lastDif) {
		var first = decipher.charAt(0);
		var rest = decipher.substring(1);
		// some of these arrays may return zero, so check if undefined
		if (SQZ_HASH[first] !== undefined) {
			return parseFloat(SQZ_HASH[first] + rest);
		} else if (DIF_HASH[first] !== undefined) {
			return parseFloat(DIF_HASH[first] + rest) + lastDif;
		}
		return parseFloat(rest);
	};
	var spectrum = new Spectrum();
	if (content === undefined || content.length === 0) {
		return spectrum;
	}
	var lines = content.split('\n');
	var sb = [];
	var xLast, xFirst, yFirst, nPoints, xFactor = 1, yFactor = 1, observeFrequency = 1, deltaX = -1, shiftOffsetNum = -1, shiftOffsetVal = -1;
	var recordMeta = true, divideByFrequency = false;
	for ( var i = 0, ii = lines.length; i < ii; i++) {
		var use = lines[i].trim();
		var index = use.indexOf('$$');
		if (index !== -1) {
			use = use.substring(0, index);
		}
		if (sb.length === 0 || !extensions.stringStartsWith(lines[i], '##')) {
			var trimmed = use.trim();
			if (sb.length !== 0 && trimmed.length!==0) {
				sb.push('\n');
			}
			sb.push(trimmed);
		} else {
			var currentRecord = sb.join('');
			if (recordMeta && currentRecord.length < 100) {
				spectrum.metadata.push(currentRecord);
			}
			sb = [ use ];
			if (extensions.stringStartsWith(currentRecord, '##TITLE=')) {
				spectrum.title = currentRecord.substring(8).trim();
			} else if (extensions.stringStartsWith(currentRecord, '##XUNITS=')) {
				spectrum.xUnit = currentRecord.substring(9).trim();
				if (this.convertHZ2PPM && spectrum.xUnit.toUpperCase() === 'HZ') {
					spectrum.xUnit = 'PPM';
					divideByFrequency = true;
				}
			} else if (extensions.stringStartsWith(currentRecord, '##YUNITS=')) {
				spectrum.yUnit = currentRecord.substring(9).trim();
			} else if (extensions.stringStartsWith(currentRecord, '##XYPAIRS=')) {
				// spectrum.yUnit = currentRecord.substring(9).trim();
			} else if (extensions.stringStartsWith(currentRecord, '##FIRSTX=')) {
				xFirst = parseFloat(currentRecord.substring(9).trim());
			} else if (extensions.stringStartsWith(currentRecord, '##LASTX=')) {
				xLast = parseFloat(currentRecord.substring(8).trim());
			} else if (extensions.stringStartsWith(currentRecord, '##FIRSTY=')) {
				yFirst = parseFloat(currentRecord.substring(9).trim());
			} else if (extensions.stringStartsWith(currentRecord, '##NPOINTS=')) {
				nPoints = parseFloat(currentRecord.substring(10).trim());
			} else if (extensions.stringStartsWith(currentRecord, '##XFACTOR=')) {
				xFactor = parseFloat(currentRecord.substring(10).trim());
			} else if (extensions.stringStartsWith(currentRecord, '##YFACTOR=')) {
				yFactor = parseFloat(currentRecord.substring(10).trim());
			} else if (extensions.stringStartsWith(currentRecord, '##DELTAX=')) {
				deltaX = parseFloat(currentRecord.substring(9).trim());
			} else if (extensions.stringStartsWith(currentRecord, '##.OBSERVE FREQUENCY=')) {
				if (this.convertHZ2PPM) {
					observeFrequency = parseFloat(currentRecord.substring(21).trim());
				}
			} else if (extensions.stringStartsWith(currentRecord, '##.SHIFT REFERENCE=')) {
				if (this.convertHZ2PPM) {
					var parts = currentRecord.substring(19).split(',');
					shiftOffsetNum = parseInt(parts[2].trim());
					shiftOffsetVal = parseFloat(parts[3].trim());
				}
			} else if (extensions.stringStartsWith(currentRecord, '##XYDATA=')) {
				if (!divideByFrequency) {
					observeFrequency = 1;
				}
				recordMeta = false;
				var lastWasDif = false;
				var innerLines = currentRecord.split('\n');
				var abscissaSpacing = (xLast - xFirst) / (nPoints - 1);
				var lastX = xFirst - abscissaSpacing;
				var lastY = yFirst;
				var lastDif = 0;
				var lastOrdinate;
				for ( var j = 1, jj = innerLines.length; j < jj; j++) {
					var data = [];
					var read = innerLines[j].trim();
					var sb = [];
					for ( var k = 0, kk = read.length; k < kk; k++) {
						if (this.isBreak(read.charAt(k))) {
							if (sb.length > 0 && !(sb.length === 1 && sb[0] === ' ')) {
								data.push(sb.join(''));
							}
							sb = [ read.charAt(k) ];
						} else {
							sb.push(read.charAt(k));
						}
					}
					data.push(sb.join(''));
					lastX = parseFloat(data[0]) * xFactor - abscissaSpacing;
					for ( var k = 1, kk = data.length; k < kk; k++) {
						var decipher = data[k];
						// some of these arrays may return zero, so
						// check if undefined
						if (DUP_HASH[decipher.charAt(0)] !== undefined) {
							// be careful when reading this, to keep
							// spectra efficient, DUPS are actually
							// discarded, except the last y!
							var dup = parseInt(DUP_HASH[decipher.charAt(0)] + decipher.substring(1)) - 1;
							for ( var l = 0; l < dup; l++) {
								lastX += abscissaSpacing;
								lastDif = this.getValue(lastOrdinate, lastDif);
								lastY = lastDif * yFactor;
								count++;
								spectrum.data[spectrum.data.length - 1] = new Point(lastX / observeFrequency, lastY);
							}
						} else {
							// some of these arrays may return zero, so
							// check if undefined
							if (!(SQZ_HASH[decipher.charAt(0)] !== undefined && lastWasDif)) {
								lastWasDif = DIF_HASH[decipher.charAt(0)] !== undefined;
								lastOrdinate = decipher;
								lastX += abscissaSpacing;
								lastDif = this.getValue(decipher, lastDif);
								lastY = lastDif * yFactor;
								count++;
								spectrum.data.push(new Point(lastX / observeFrequency, lastY));
							} else {
								lastY = this.getValue(decipher, lastDif) * yFactor;
							}
						}
					}
				}
				if (shiftOffsetNum !== -1) {
					var dif = shiftOffsetVal - spectrum.data[shiftOffsetNum - 1].x;
					for ( var i = 0, ii = spectrum.data.length; i < ii; i++) {
						spectrum.data[i].x += dif;
					}
				}
			} else if (extensions.stringStartsWith(currentRecord, '##PEAK TABLE=')) {
				recordMeta = false;
				spectrum.continuous = false;
				var innerLines = currentRecord.split('\n');
				var count = 0;
				var reg = /[\s,]+/;
				for ( var j = 1, jj = innerLines.length; j < jj; j++) {
					var items = innerLines[j].split(reg);
					count += items.length / 2;
					for ( var k = 0, kk = items.length; k + 1 < kk; k += 2) {
						spectrum.data.push(new Point(parseFloat(items[k].trim()), parseFloat(items[k + 1].trim())));
					}
				}
			} else if (extensions.stringStartsWith(currentRecord, '##ATOMLIST=')) {
				spectrum.molecule = new Molecule();
				var innerLines = currentRecord.split('\n');
				var reg = /[\s]+/;
				for ( var j = 1, jj = innerLines.length; j < jj; j++) {
					var items = innerLines[j].split(reg);
					spectrum.molecule.atoms.push(new Atom(items[1]));
				}
			} else if (extensions.stringStartsWith(currentRecord, '##BONDLIST=')) {
				var innerLines = currentRecord.split('\n');
				var reg = /[\s]+/;
				for ( var j = 1, jj = innerLines.length; j < jj; j++) {
					var items = innerLines[j].split(reg);
					var order = 1;
					if(items[2]==='D'){
						order = 2;
					}else if(items[2]==='T'){
						order = 3;
					}
					spectrum.molecule.bonds.push(new Bond(spectrum.molecule.atoms[parseInt(items[0])-1], spectrum.molecule.atoms[parseInt(items[1])-1], order));
				}
			} else if (spectrum.molecule && extensions.stringStartsWith(currentRecord, '##XY_RASTER=')) {
				var innerLines = currentRecord.split('\n');
				var reg = /[\s]+/;
				for ( var j = 1, jj = innerLines.length; j < jj; j++) {
					var items = innerLines[j].split(reg);
					var a = spectrum.molecule.atoms[parseInt(items[0])-1];
					a.x = parseInt(items[1]);
					a.y = parseInt(items[2]);
					if(items.length==4){
						a.z = parseInt(items[3]);
					}
				}
				spectrum.molecule.scaleToAverageBondLength(20);
			} else if (extensions.stringStartsWith(currentRecord, '##PEAK ASSIGNMENTS=')) {
				var innerLines = currentRecord.split('\n');
				var reg = /[\s,()<>]+/;
				spectrum.assignments = [];
				for ( var j = 1, jj = innerLines.length; j < jj; j++) {
					var items = innerLines[j].split(reg);
					var x = parseFloat(items[1]);
					var y = parseFloat(items[2]);
					var a = spectrum.molecule.atoms[parseInt(items[3])-1];
					var used = false;
					for(var k = 0, kk = spectrum.assignments.length; k<kk; k++){
						var assign = spectrum.assignments[k];
						if(assign.x === x){
							assign.as.push(a);
							a.assigned = assign;
							used = true;
							break;
						}
					}
					if(!used){
						var assign = {x:x, y:y, as:[a]};
						a.assigned = assign;
						spectrum.assignments.push(assign);
					}
				}
			}
		}
	}
	spectrum.setup();
	return spectrum;
};
_.makeStructureSpectrumSet = function(id, content) {
	this.convertHZ2PPM = true;
	var spectrum = this.read(content);
	var mcanvas = new ViewerCanvas(id+'_molecule', 200,200);
	mcanvas.specs.atoms_displayTerminalCarbonLabels_2D = true;
	mcanvas.specs.atoms_displayImplicitHydrogens_2D = true;
	mcanvas.mouseout = function(e){
		if(this.molecules.length!==0){
			for(var i = 0, ii = this.molecules[0].atoms.length; i<ii; i++){
				this.molecules[0].atoms[i].isHover = false;
			}
			spectrum.hovered = undefined;
			this.repaint();
			scanvas.repaint();
		}
	};
	mcanvas.touchend = mcanvas.mouseout;
	mcanvas.mousemove = function(e){
		if(this.molecules.length!==0){
			var closest=undefined;
			for(var i = 0, ii = this.molecules[0].atoms.length; i<ii; i++){
				var a = this.molecules[0].atoms[i];
				a.isHover = false;
				if(a.assigned && (closest===undefined || e.p.distance(a)<e.p.distance(closest))){
					closest = a;
				}
			}
			spectrum.hovered = undefined;
			if(e.p.distance(closest)<20){
				for(var i = 0, ii = closest.assigned.as.length; i<ii; i++){
					closest.assigned.as[i].isHover = true;
				}
				scanvas.spectrum.hovered = closest.assigned;
			}
			this.repaint();
			scanvas.repaint();
		}
	};
	mcanvas.touchmove = mcanvas.mousemove;
	mcanvas.drawChildExtras = function(ctx, specs){
		if(this.molecules.length!==0){
			for(var i = 0, ii = this.molecules[0].atoms.length; i<ii; i++){
				this.molecules[0].atoms[i].drawDecorations(ctx, specs);
			}
		}
	};
	var scanvas = new ObserverCanvas(id+'_spectrum', 400,200);
	scanvas.specs.plots_showYAxis = false;
	scanvas.specs.plots_flipXAxis = true;
	scanvas.mouseout = function(e){
		if(this.spectrum && this.spectrum.assignments){
			for(var i = 0, ii = mcanvas.molecules[0].atoms.length; i<ii; i++){
				mcanvas.molecules[0].atoms[i].isHover = false;
			}
			this.spectrum.hovered = undefined;
			mcanvas.repaint();
			this.repaint();
		}
	};
	scanvas.touchend = scanvas.mouseout;
	scanvas.mousemove = function(e){
		if(this.spectrum && this.spectrum.assignments){
			var closest=undefined;
			for(var i = 0, ii = mcanvas.molecules[0].atoms.length; i<ii; i++){
				mcanvas.molecules[0].atoms[i].isHover = false;
			}
			this.spectrum.hovered = undefined;
			for(var i = 0, ii = this.spectrum.assignments.length; i<ii; i++){
				var a = this.spectrum.assignments[i];
				if(closest===undefined || Math.abs(this.spectrum.getTransformedX(a.x, this.specs, this.spectrum.memory.width, this.spectrum.memory.offsetLeft)-e.p.x)<Math.abs(this.spectrum.getTransformedX(closest.x, this.specs, this.spectrum.memory.width, this.spectrum.memory.offsetLeft)-e.p.x)){
					closest = a;
				}
			}
			if(Math.abs(this.spectrum.getTransformedX(closest.x, this.specs, this.spectrum.memory.width, this.spectrum.memory.offsetLeft)-e.p.x)<20){
				for(var i = 0, ii = closest.as.length; i<ii; i++){
					closest.as[i].isHover = true;
				}
				this.spectrum.hovered = closest;
			}
			mcanvas.repaint();
			this.repaint();
		}
	};
	scanvas.touchmove = scanvas.mousemove;
	scanvas.drawChildExtras = function(ctx){
		if(this.spectrum && this.spectrum.hovered){
			var x = this.spectrum.getTransformedX(this.spectrum.hovered.x, scanvas.specs, this.spectrum.memory.width, this.spectrum.memory.offsetLeft);
			if (x >= this.spectrum.memory.offsetLeft && x < this.spectrum.memory.width) {
				ctx.save();
				ctx.strokeStyle='#885110';
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(x, this.spectrum.memory.height - this.spectrum.memory.offsetBottom);
				ctx.lineTo(x, this.spectrum.getTransformedY(this.spectrum.hovered.y, scanvas.specs, this.spectrum.memory.height, this.spectrum.memory.offsetBottom, this.spectrum.memory.offsetTop));
				ctx.stroke();
				ctx.restore();
			}
		}
	};
	if(spectrum){
		scanvas.loadSpectrum(spectrum);
		if(spectrum.molecule){
			mcanvas.loadMolecule(spectrum.molecule);
		}
	}
	return [mcanvas, scanvas];
};
