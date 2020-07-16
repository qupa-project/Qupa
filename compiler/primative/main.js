const File = require('./../component/file.js');
const TypeDef = require('../component/typedef.js');
const Project = require('../component/project.js');


let types = {
	void: new TypeDef(null, {
		tokens: [
			{
				type   : "name",
				tokens : 'void'
			},
			{
				type   : "integer",
				tokens : "0"
			}
		],
		ref: {
			start: null,
			end: null
		}
	}, true),
	bool: new TypeDef(null, {
		tokens: [
			{
				type   : "name",
				tokens : 'i1'
			},
			{
				type   : "integer",
				tokens : "1"
			}
		],
		ref: {
			start: null,
			end: null
		}
	}, true),
	float: new TypeDef(null, {
		tokens: [
			{
				type   : "name",
				tokens : 'float'
			},
			{
				type   : "integer",
				tokens : "4"
			}
		],
		ref: {
			start: null,
			end: null
		}
	}, true),
	double: new TypeDef(null, {
		tokens: [
			{
				type   : "name",
				tokens : 'double'
			},
			{
				type   : "integer",
				tokens : "8"
			}
		],
		ref: {
			start: null,
			end: null
		}
	}, true)
};
for (let i=1; i<=8; i+=i) {
	let name = `i${i*8}`;
	types[name] = new TypeDef(null, {
		tokens: [
			{
				type   : "name",
				tokens : name
			},
			{
				type   : "integer",
				tokens : i.toString()
			}
		],
		ref: {
			start: null,
			end: null
		}
	}, true);

	name = `u${i*8}`;
	types[name] = new TypeDef(null, {
		tokens: [
			{
				type   : "name",
				tokens : name
			},
			{
				type   : "integer",
				tokens : i.toString()
			}
		],
		ref: {
			start: null,
			end: null
		}
	}, true);
}

types.int = types.i32;




/**
 * 
 * @param {Project} ctx 
 */
function Generate (ctx) {
	let file = new File(ctx, 0, "primative");

	for (let name in types) {
		file.names[name] = types[name];
	}

	ctx.inject(file);
}

module.exports = { Generate, types };