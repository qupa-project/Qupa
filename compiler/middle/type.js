const Instruction = require("./instruction.js");

class Name extends Instruction {
	constructor(term, pointerDepth, ref) {
		super (ref);
		this.term = term;
		this.pointer = pointerDepth;
	}

	toLLVM(indent) {
		let lvl = "";
		for (let i=0; i<this.pointer; i++) {
			lvl += "*";
		}

		return super.toLLVM(`${this.term}${lvl}`, indent);
	}
}
module.exports = Name;