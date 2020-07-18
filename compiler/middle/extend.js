const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Extend extends Instruction {
	/**
	 * 
	 * @param {LLVM.Type} type 
	 * @param {LLVM.Name} reg_address 
	 * @param {LLVM.Constant[]} cnst_term 
	 * @param {BNF_Reference} ref 
	 */
	constructor(mode, type, target, ref) {
		super (ref);
		this.mode   = mode;
		this.type   = type;
		this.target = target;
	}

	toLLVM() {
		return super.toLLVM(
			( this.mode == 2 ? "f" : ( this.mode == 1 ? "s" : "z" ) ) +
			`ext ` +
			`${this.target.toLLVM()} to ` +
			`${this.type.toLLVM()} `,
		0);
	}
}

module.exports = Extend;