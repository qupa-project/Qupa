const Instruction = require("./Instruction.js");

class Name extends Instruction {
	constructor(term, pointer, ref) {
		super (ref);
		this.term = term;
		this.isPointer = pointer;
	}

	toLLVM(indent) {
		return super.toLLVM(`${this.term}${this.isPointer ? "*" : ""}`, indent);
	}
}
module.exports = Name;