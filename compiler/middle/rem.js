const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Rem extends Instruction {
	/**
	 * 
	 * @param {LLVM.Type} type 
	 * @param {LLVM.Name} reg_address 
	 * @param {LLVM.Constant[]} cnst_term 
	 * @param {BNF_Reference} ref 
	 */
	constructor(mode, type, opperand_a, opperand_b, ref) {
		super (ref);
		this.mode = mode;
		this.type = type;
		this.a = opperand_a;
		this.b = opperand_b;
	}

	toLLVM() {
		return super.toLLVM(
			( this.mode == 0 ? "u" : ( this.mode == 1 ? "s" : "f" ) ) +
			`rem ` +
			`${this.type.toLLVM()} ` +
			`${this.a.toLLVM()}, ` +
			`${this.b.toLLVM()}`,
		0);
	}
}

module.exports = Rem;