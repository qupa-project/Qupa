const LLVM = require('./../middle/llvm.js');

class Import {
	constructor (ctx, ast) {
		this.ctx      = ctx;
		this.ref      = ast.ref.start;

		this.name = ast.tokens[1] || "*";
		this.files = [{
			file: null,
			path: ast.tokens[0],
			ref: ast.ref.start
		}];
	}

	merge(other) {
		if (
			other instanceof Import &&
			this.name == "*"
		) {
			this.files = this.files.concat(other.files);
			return true;
		}

		return false;
	}

	load() {
		let file = this.ctx.getFile();
		for (let extern of this.files) {
			extern.file = file.import(extern.path);
		}
	}

	getType(variable) {
		for (let extern of this.files) {
			let opt = extern.file.getType(variable);
			if (opt) {
				return opt;
			}
		}

		return null;
	}

	link() {
		return;
	}

	compile() {
		let frag = new LLVM.Fragment();
		frag.append(new LLVM.Comment(`Imported under ${this.name}:`))
		for (let extern of this.files) {
			frag.append(new LLVM.Comment(`  ${extern.path}`));
		}

		return frag;
	}
}
module.exports = Import;