import JSONInterpreter from '../io/JSONInterpreter';

export default function StructureBuilder() {
};
var _ = StructureBuilder.prototype;
_.copy = function(molecule) {
	var json = new JSONInterpreter();
	return json.molFrom(json.molTo(molecule));
};
