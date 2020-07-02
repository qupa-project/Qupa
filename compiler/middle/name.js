const Instruction = require("./Instruction");

class Name extends Instruction {
	constructor(term, global, ref) {
		super (ref);
		this.term = term;
		this.isGlobal = global;
	}

	toLLVM() {
		return `${this.isGlobal ? "@" : "%"}${this.term}`;
	}
}
module.exports = Name;