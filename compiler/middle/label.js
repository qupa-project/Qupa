const Instruction = require("./instruction.js");

class Label extends Instruction {
	/**
	 * 
	 * @param {LLVM.Name} term 
	 * @param {BNF_Reference?} ref 
	 */
	constructor(name, ref) {
		super (ref);
		this.name = name;
	}

	toLLVM() {
		return `label ${this.name.toLLVM()}`;
	}
}
module.exports = Label;