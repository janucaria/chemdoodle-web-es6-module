import _Interpreter from './_Interpreter';
import {
	default_bondLength_2D,
	readMOL,
	writeMOL
} from '../../ChemDoodle';
import {
	Point,
	Molecule,
	d2
} from '../structures';

export default function RXNInterpreter() {
};
var _ = RXNInterpreter.prototype = new _Interpreter();
_.read = function(content, multiplier) {
	if (!multiplier) {
		multiplier = default_bondLength_2D;
	}
	var molecules = [];
	var line;
	if (!content) {
		molecules.push(new Molecule());
		line = new d2.Line(new Point(-20, 0), new Point(20, 0));
	} else {
		var contentTokens = content.split('$MOL\n');
		var headerTokens = contentTokens[0].split('\n');
		var counts = headerTokens[4];
		var numReactants = parseInt(counts.substring(0, 3));
		var numProducts = parseInt(counts.substring(3, 6));
		var currentMolecule = 1;
		var start = 0;
		for ( var i = 0, ii = numReactants + numProducts; i < ii; i++) {
			molecules[i] = readMOL(contentTokens[currentMolecule], multiplier);
			var b = molecules[i].getBounds();
			var width = b.maxX - b.minX;
			start -= width + 40;
			currentMolecule++;
		}
		for ( var i = 0, ii = numReactants; i < ii; i++) {
			var b = molecules[i].getBounds();
			var width = b.maxX - b.minX;
			var center = molecules[i].getCenter();
			for ( var j = 0, jj = molecules[i].atoms.length; j < jj; j++) {
				var a = molecules[i].atoms[j];
				a.x += start + (width / 2) - center.x;
				a.y -= center.y;
			}
			start += width + 40;
		}
		line = new d2.Line(new Point(start, 0), new Point(start + 40, 0));
		start += 80;
		for ( var i = numReactants, ii = numReactants + numProducts; i < ii; i++) {
			var b = molecules[i].getBounds();
			var width = b.maxX - b.minX;
			var center = molecules[i].getCenter();
			for ( var j = 0; j < molecules[i].atoms.length; j++) {
				var a = molecules[i].atoms[j];
				a.x += start + (width / 2) - center.x;
				a.y -= center.y;
			}
			start += width + 40;
		}
	}
	line.arrowType = d2.Line.ARROW_SYNTHETIC;
	return {
		'molecules' : molecules,
		'shapes' : [ line ]
	};
};
_.write = function(mols, shapes) {
	var molecules = [ [], [] ];
	var ps = undefined;
	if (!mols || !shapes) {
		return;
	}
	for (i = 0, ii = shapes.length; i < ii; i++) {
		if (shapes[i] instanceof d2.Line) {
			ps = shapes[i].getPoints();
			break;
		}
	}
	if (!ps) {
		return '';
	}
	for ( var i = 0, ii = mols.length; i < ii; i++) {
		var center = mols[i].getCenter();
		if (center.x < ps[1].x) {
			molecules[0].push(mols[i]);
		} else {
			molecules[1].push(mols[i]);
		}
	}
	var sb = [];
	sb.push('$RXN\nReaction from ChemDoodle Web Components\n\nhttp://www.ichemlabs.com\n');
	sb.push(this.fit(molecules[0].length.toString(), 3));
	sb.push(this.fit(molecules[1].length.toString(), 3));
	sb.push('\n');
	for ( var i = 0; i < 2; i++) {
		for ( var j = 0, jj = molecules[i].length; j < jj; j++) {
			sb.push('$MOL\n');
			sb.push(writeMOL(molecules[i][j]));
			sb.push('\n');
		}
	}
	return sb.join('');
};
