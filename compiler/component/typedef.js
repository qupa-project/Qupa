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

		this.represent = external ? this.name : `${this.name}@${this.ctx.getFileID().toString(36)}.${this.id.toString(36)}`;
	}

	link() {
		return;
	}

	getSize() {
		return Number(this.ast.tokens[1].tokens);
	}

	compile() {
		return `; Assume Typedef: ${this.represent}, ${this.getSize()}`;
		// throw "TODO";
	}
}
module.exports = TypeDef;