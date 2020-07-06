const Instruction = require("./instruction.js");

class Branch_Unco extends Instruction {
	/**
	 * 
	 * @param {LLVM.Label} term 
	 * @param {BNF_Reference?} ref 
	 */
	constructor(label, ref) {
		super (ref);
		this.label = label;
	}

	toLLVM() {
		return `br ${this.label.toLLVM()}`;
	}
}
module.exports = Branch_Unco;