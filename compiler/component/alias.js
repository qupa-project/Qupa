const Flattern = require('./../parser/flattern.js');
const LLVM = require('./../middle/llvm.js');

class Alias {
	constructor (ctx, ast) {
		this.ctx      = ctx;
		this.ast      = ast;
		this.ref      = ast.ref.start;

		this.linked = false;

		this.name = ast.tokens[0].tokens;

		this.target = null;
	}

	resolve() {
		if (!this.linked) {
			this.link();
		}

		return this.target;
	}

	merge() {
		return false;
	}

	link() {
		if (this.linked) {
			return;
		}

		let file = this.ctx.getFile();
		this.target = file.getType(Flattern.VariableList(this.ast.tokens[1]).slice(1));
		if (!this.target) {
			file.throw(`Link Error: Unknown type ${Flattern.VariableStr(this.ast.tokens[1])}`, this.ref);
		}

		return;
	}

	compile() {
		return new LLVM.Fragment();
	}
}
module.exports = Alias;