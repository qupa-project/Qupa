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

	toLLVM(indent) {
		return super.toLLVM(`br ${this.label.toLLVM()}`, indent);
	}
}
module.exports = Branch_Unco;