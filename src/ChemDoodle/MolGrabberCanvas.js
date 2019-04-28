import _Canvas from './_Canvas';
import { jQuery as q } from './lib';
import iChemLabs from './iChemLabs';

export default function MolGrabberCanvas(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
	var sb = [];
	sb.push('<br><input type="text" id="');
	sb.push(id);
	sb.push('_query" size="32" value="" />');
	sb.push(this.getInputFields());

	// Don't use document.writeln here, it breaks the whole page after
	// document is closed.
	document.getElementById(id);
	var canvas = q('#' + id);
	canvas.after(sb.join(''));

	var self = this;
	q('#' + id + '_submit').click(function() {
		self.search();
	});
	q('#' + id + '_query').keypress(function(e) {
		if (e.which === 13) {
			self.search();
		}
	});
	this.emptyMessage = 'Enter search term below';
	this.repaint();
};
var _ = MolGrabberCanvas.prototype = new _Canvas();
_.setSearchTerm = function(term) {
	q('#' + this.id + '_query').val(term);
	this.search();
};
_.getInputFields = function(){
	var sb = [];
	sb.push('<br><nobr>');
	sb.push('<select id="');
	sb.push(this.id);
	sb.push('_select">');
	sb.push('<option value="chemexper">ChemExper');
	sb.push('<option value="chemspider">ChemSpider');
	sb.push('<option value="pubchem" selected>PubChem');
	sb.push('</select>');
	sb.push('<button id="');
	sb.push(this.id);
	sb.push('_submit">Show Molecule</button>');
	sb.push('</nobr>');
	return sb.join('');
};
_.search = function() {
	this.emptyMessage = 'Searching...';
	this.clear();
	var self = this;
	iChemLabs.getMoleculeFromDatabase(q('#' + this.id + '_query').val(), {
		database : q('#' + this.id + '_select').val()
	}, function(mol) {
		self.loadMolecule(mol);
	});
};
