class TypeDef {
	constructor (ctx, ast, external = false) {
		this.ctx      = ctx;
		this.ast      = ast;
		this.external = external;

		this.name = ast.tokens[0].tokens;
	}

	link() {
		return;
	}

	compile() {
		throw "TODO";
	}
}
module.exports = TypeDef;