const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Trunc extends Instruction {
	/**
	 * 
	 * @param {LLVM.Name} reg_address 
	 * @param {LLVM.Constant[]} cnst_term 
	 * @param {BNF_Reference} ref 
	 */
	constructor(mode, type, target, ref) {
		super (ref);
		this.mode   = mode;
		this.target = target;
		this.type   = type;
	}

	toLLVM() {
		return super.toLLVM(
			( this.mode == 1 ? "fp" : "" ) +
			`trunc ` +
			`${this.target.toLLVM()} to ` +
			`${this.type.toLLVM()}`,
		0);
	}
}

module.exports = Trunc;