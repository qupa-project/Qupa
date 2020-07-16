const File = require('./../component/file.js');
const Project = require('../component/project.js');

const types = require('./types.js');
const Math = require('./math.js');




/**
 * 
 * @param {Project} ctx 
 */
function Generate (ctx) {
	let file = new File(ctx, 0, "primative");

	for (let name in types) {
		file.names[name] = types[name];
	}

	file.names.Add = new Math(file, "Add");
	file.names.Div = new Math(file, "Div");
	file.names.Mul = new Math(file, "Mul");
	file.names.Rem = new Math(file, "Rem");
	file.names.Sub = new Math(file, "Sub");

	ctx.inject(file);
}

module.exports = { Generate, types };