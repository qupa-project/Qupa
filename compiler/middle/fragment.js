const Instruction = require("./Instruction");

class Fragment {
	constructor () {
		this.stmts = [];
	}

	append(instruction) {
		this.stmts.push(instruction);
	}

	merge (other) {
		this.stmts = this.stmts.concat(other.stmts);
	}

	toLLVM () {
		return this.stmts.map(x => x.toLLVM()).join("\n");
	}
}

module.exports = Fragment;