const Instruction = require("./instruction.js");

class Branch extends Instruction {
	/**
	 * 
	 * @param {LLVM.Argument} condition 
	 * @param {LLVM.Label} label_true 
	 * @param {LLVM.Label} label_false 
	 * @param {BNF_Reference} ref 
	 */
	constructor(condition, label_true, label_false, ref) {
		super (ref);
		this.condition = condition;
		this.true  = label_true;
		this.false = label_false;
	}

	toLLVM() {
		return `br ${this.condition.toLLVM()}, ${this.true.toLLVM()}, ${this.false.toLLVM()}`;
	}
}
module.exports = Branch;