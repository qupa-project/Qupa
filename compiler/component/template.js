const LLVM = require("../middle/llvm");

class Template {
	constructor(ctx, ast) {
		this.ctx = ctx;

		this.name = "Unknown";
		this.instances = [];
	}

	getType() {
		return false;
	}
	getFunction() {
		return false;
	}

	merge(other) {
		return false;
	}

	link() {
		return;
	}

	compile(){
		return new LLVM.Fragment();
	}
}

module.exports = Template;