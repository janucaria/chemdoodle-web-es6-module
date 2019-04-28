import JSONInterpreter from './io/JSONInterpreter';
import { Queue, Molecule } from './structures';
import { jQuery as q } from './lib';
import { getVersion } from '../ChemDoodle';

let iChemLabs = {};
export default iChemLabs;

iChemLabs.SERVER_URL = 'https://ichemlabs.cloud.chemdoodle.com/icl_cdc_v070001/WebHQ';

iChemLabs.inRelay = false;
iChemLabs.asynchronous = true;

iChemLabs.INFO = {
	userAgent : navigator.userAgent,
	v_cwc : getVersion(),
	v_jQuery : q.fn.jquery,
	v_jQuery_ui : (q.ui ? q.ui.version : 'N/A')
};

var JSON_INTERPRETER = new JSONInterpreter();
var queue = new Queue();

iChemLabs._contactServer = function(call, content, options, callback, errorback) {
	if (this.inRelay) {
		queue.enqueue({
			'call' : call,
			'content' : content,
			'options' : options,
			'callback' : callback,
			'errorback' : errorback
		});
	} else {
		iChemLabs.inRelay = true;
		q.ajax({
			dataType : 'text',
			type : 'POST',
			data : JSON.stringify({
				'call' : call,
				'content' : content,
				'options' : options,
				'info' : iChemLabs.INFO
			}),
			url : this.SERVER_URL,
			success : function(data) {
				var o = JSON.parse(data);
				if (o.message) {
					alert(o.message);
				}
				iChemLabs.inRelay = false;
				if (callback && o.content && !o.stop) {
					callback(o.content);
				}
				if (o.stop && errorback) {
					errorback();
				}
				if(!queue.isEmpty()){
					var next = queue.dequeue();
					iChemLabs._contactServer(next.call, next.content, next.options, next.callback, next.errorback);
				}
			},
			error : function(xhr, status, error) {
				if(call!='checkForUpdates'){
					alert('Call failed. Please try again. If you continue to see this message, please contact iChemLabs customer support.');
				}
				iChemLabs.inRelay = false;
				if (errorback) {
					errorback();
				}
				if(!queue.isEmpty()){
					var next = queue.dequeue();
					iChemLabs._contactServer(next.call, next.content, next.options, next.callback, next.errorback);
				}
			},
			xhrFields : {
				withCredentials : true
			},
			async : iChemLabs.asynchronous
		});
	}
};

// undocumented, this call is for clients that have licensed cloud for their
// own servers
iChemLabs.authenticate = function(credential, options, callback, errorback) {
	this._contactServer('authenticate', {
		'credential' : credential
	}, options, function(content) {
		callback(content);
	}, errorback);
};

iChemLabs.calculate = function(mol, options, callback, errorback) {
	this._contactServer('calculate', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(content);
	}, errorback);
};

iChemLabs.createLewisDotStructure = function(mol, options, callback, errorback) {
	this._contactServer('createLewisDot', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(JSON_INTERPRETER.molFrom(content.mol));
	}, errorback);
};

iChemLabs.generateImage = function(mol, options, callback, errorback) {
	this._contactServer('generateImage', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(content.link);
	}, errorback);
};

iChemLabs.generateIUPACName = function(mol, options, callback, errorback) {
	this._contactServer('generateIUPACName', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(content.iupac);
	}, errorback);
};

iChemLabs.getAd = function(callback, errorback) {
	this._contactServer('getAd', {}, {}, function(content) {
		callback(content.image_url, content.target_url);
	}, errorback);
};

iChemLabs.getMoleculeFromContent = function(input, options, callback, errorback) {
	this._contactServer('getMoleculeFromContent', {
		'content' : input
	}, options, function(content) {
		var z = false;
		for ( var i = 0, ii = content.mol.a.length; i < ii; i++) {
			if (content.mol.a[i].z !== 0) {
				z = true;
				break;
			}
		}
		if (z) {
			for ( var i = 0, ii = content.mol.a.length; i < ii; i++) {
				content.mol.a[i].x /= 20;
				content.mol.a[i].y /= 20;
				content.mol.a[i].z /= 20;
			}
		}
		callback(JSON_INTERPRETER.molFrom(content.mol));
	}, errorback);
};

iChemLabs.getMoleculeFromDatabase = function(query, options, callback, errorback) {
	this._contactServer('getMoleculeFromDatabase', {
		'query' : query
	}, options, function(content) {
		if (options.dimension === 3) {
			for ( var i = 0, ii = content.mol.a.length; i < ii; i++) {
				content.mol.a[i].x /= 20;
				content.mol.a[i].y /= -20;
				content.mol.a[i].z /= 20;
			}
		}
		callback(JSON_INTERPRETER.molFrom(content.mol));
	}, errorback);
};

iChemLabs.getOptimizedPDBStructure = function(id, options, callback, errorback) {
	this._contactServer('getOptimizedPDBStructure', {
		'id' : id
	}, options, function(content) {
		var mol;
		if (content.mol) {
			mol = JSON_INTERPRETER.molFrom(content.mol);
		} else {
			mol = new Molecule();
		}
		mol.chains = JSON_INTERPRETER.chainsFrom(content.ribbons);
		mol.fromJSON = true;
		callback(mol);
	}, errorback);
};

iChemLabs.getZeoliteFromIZA = function(query, options, callback, errorback) {
	this._contactServer('getZeoliteFromIZA', {
		'query' : query
	}, options, function(content) {
		callback(ChemDoodle.readCIF(content.cif, options.xSuper, options.ySuper, options.zSuper));
	}, errorback);
};

iChemLabs.isGraphIsomorphism = function(arrow, target, options, callback, errorback) {
	this._contactServer('isGraphIsomorphism', {
		'arrow' : JSON_INTERPRETER.molTo(arrow),
		'target' : JSON_INTERPRETER.molTo(target)
	}, options, function(content) {
		callback(content.value);
	}, errorback);
};

iChemLabs.isSubgraphIsomorphism = function(arrow, target, options, callback, errorback) {
	this._contactServer('isSubgraphIsomorphism', {
		'arrow' : JSON_INTERPRETER.molTo(arrow),
		'target' : JSON_INTERPRETER.molTo(target)
	}, options, function(content) {
		callback(content.value);
	}, errorback);
};

iChemLabs.isSupergraphIsomorphism = function(arrow, target, options, callback, errorback) {
	this._contactServer('isSupergraphIsomorphism', {
		'arrow' : JSON_INTERPRETER.molTo(arrow),
		'target' : JSON_INTERPRETER.molTo(target)
	}, options, function(content) {
		callback(content.value);
	}, errorback);
};

iChemLabs.getSimilarityMeasure = function(first, second, options, callback, errorback) {
	this._contactServer('getSimilarityMeasure', {
		'first' : JSON_INTERPRETER.molTo(first),
		'second' : JSON_INTERPRETER.molTo(second)
	}, options, function(content) {
		callback(content.value);
	}, errorback);
};

iChemLabs.kekulize = function(mol, options, callback, errorback) {
	this._contactServer('kekulize', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(JSON_INTERPRETER.molFrom(content.mol));
	}, errorback);
};

iChemLabs.mechanismMatch = function(arrow, targets, options, callback, errorback) {
	this._contactServer('matchMechanism', {
		'arrow' : arrow,
		'targets' : targets
	}, options, function(content) {
		callback(content);
	}, errorback);
};

iChemLabs.optimize = function(mol, options, callback, errorback) {
	this._contactServer('optimize', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		var optimized = JSON_INTERPRETER.molFrom(content.mol);
		if (options.dimension === 2) {
			for ( var i = 0, ii = optimized.atoms.length; i < ii; i++) {
				mol.atoms[i].x = optimized.atoms[i].x;
				mol.atoms[i].y = optimized.atoms[i].y;
			}
			callback();
		} else if (options.dimension === 3) {
			for ( var i = 0, ii = optimized.atoms.length; i < ii; i++) {
				optimized.atoms[i].x /= 20;
				optimized.atoms[i].y /= -20;
				optimized.atoms[i].z /= 20;
			}
			callback(optimized);
		}
	}, errorback);
};

iChemLabs.readIUPACName = function(iupac, options, callback, errorback) {
	this._contactServer('readIUPACName', {
		'iupac' : iupac
	}, options, function(content) {
		callback(JSON_INTERPRETER.molFrom(content.mol));
	}, errorback);
};

iChemLabs.readSMILES = function(smiles, options, callback, errorback) {
	this._contactServer('readSMILES', {
		'smiles' : smiles
	}, options, function(content) {
		callback(JSON_INTERPRETER.molFrom(content.mol));
	}, errorback);
};

iChemLabs.saveFile = function(mol, options, callback, errorback) {
	this._contactServer('saveFile', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(content.link);
	}, errorback);
};

iChemLabs.simulate13CNMR = function(mol, options, callback, errorback) {
	options.nucleus = 'C';
	options.isotope = 13;
	this._contactServer('simulateNMR', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(c.readJCAMP(content.jcamp));
	}, errorback);
};

iChemLabs.simulate1HNMR = function(mol, options, callback, errorback) {
	options.nucleus = 'H';
	options.isotope = 1;
	this._contactServer('simulateNMR', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(c.readJCAMP(content.jcamp));
	}, errorback);
};

iChemLabs.simulateMassParentPeak = function(mol, options, callback, errorback) {
	this._contactServer('simulateMassParentPeak', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(c.readJCAMP(content.jcamp));
	}, errorback);
};

iChemLabs.writeSMILES = function(mol, options, callback, errorback) {
	this._contactServer('writeSMILES', {
		'mol' : JSON_INTERPRETER.molTo(mol)
	}, options, function(content) {
		callback(content.smiles);
	}, errorback);
};

iChemLabs.version = function(options, callback, errorback) {
	this._contactServer('version', {}, options, function(content) {
		callback(content.value);
	}, errorback);
};

iChemLabs.checkForUpdates = function(options) {
	this._contactServer('checkForUpdates', {
		'value' : location.href
	}, options, function(content) {}, function(){});
};
