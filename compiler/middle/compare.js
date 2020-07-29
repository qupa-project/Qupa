const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Compare extends Instruction {
	/**
	 *
	 * @param {LLVM.Type} type
	 * @param {LLVM.Name} reg_address
	 * @param {LLVM.Constant[]} cnst_term
	 * @param {BNF_Reference} ref
	 */
	constructor(mode, conditon, type, opperand_a, opperand_b, ref) {
		super (ref);
		this.mode = mode;
		this.cond = conditon;
		this.type = type;
		this.a = opperand_a;
		this.b = opperand_b;
	}

	toLLVM() {
		return super.toLLVM(
			( this.mode == 2 ? "f" : "i" ) +
			`cmp ` +
			`${this.cond} ` +
			`${this.type.toLLVM()} ` +
			`${this.a.toLLVM()}, ` +
			`${this.b.toLLVM()}`,
		0);
	}
}

module.exports = Compare;