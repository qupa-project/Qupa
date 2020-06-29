const { Generator_ID } = require('./generate.js');
let typeIDGen = new Generator_ID();

class TypeDef {
	constructor (ctx, ast, external = false) {
		this.ctx      = ctx;
		this.ast      = ast;
		this.ref      = ast.ref.start;
		this.external = external;

		this.id = typeIDGen.next();

		this.name = ast.tokens[0].tokens;

		this.represent = external ? this.name : `${this.name}@${this.ctx.getFileID()}.${this.id}`;
	}

	link() {
		return;
	}

	compile() {
		throw "TODO";
	}
}
module.exports = TypeDef;