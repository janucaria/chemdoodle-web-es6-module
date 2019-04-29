import _Canvas3D from './_Canvas3D';
import iChemLabs from './iChemLabs';
import { jQuery as q } from './lib';

export default function MolGrabberCanvas3D(id, width, height) {
	if (id) {
		this.create(id, width, height);
	}
	var sb = [];
	sb.push('<br><input type="text" id="');
	sb.push(id);
	sb.push('_query" size="32" value="" />');
	sb.push('<br><nobr>');
	sb.push('<select id="');
	sb.push(id);
	sb.push('_select">');
	// sb.push('<option value="chemexper">ChemExper');
	// sb.push('<option value="chemspider">ChemSpider');
	sb.push('<option value="pubchem" selected>PubChem');
	sb.push('</select>');
	sb.push('<button id="');
	sb.push(id);
	sb.push('_submit">Show Molecule</button>');
	sb.push('</nobr>');
	document.writeln(sb.join(''));
	var self = this;
	q('#' + id + '_submit').click(function() {
		self.search();
	});
	q('#' + id + '_query').keypress(function(e) {
		if (e.which === 13) {
			self.search();
		}
	});
};
var _ = MolGrabberCanvas3D.prototype = new _Canvas3D();
_.setSearchTerm = function(term) {
	q('#' + this.id + '_query').val(term);
	this.search();
};
_.search = function() {
	var self = this;
	iChemLabs.getMoleculeFromDatabase(q('#' + this.id + '_query').val(), {
		database : q('#' + this.id + '_select').val(),
		dimension : 3
	}, function(mol) {
		self.loadMolecule(mol);
	});
};
