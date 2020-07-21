const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class FloatConvert extends Instruction {
	/**
	 *
	 * @param {LLVM.Type} type
	 * @param {LLVM.Name} reg_address
	 * @param {LLVM.Constant[]} cnst_term
	 * @param {BNF_Reference} ref
	 */
	constructor(a, b, type, target, ref) {
		super (ref);
		this.a      = a;
		this.b      = b;
		this.type   = type;
		this.target = target;
	}

	toLLVM() {
		return super.toLLVM(
			`${this.a}to${this.b} ` +
			`${this.target.toLLVM()} to ` +
			`${this.type.toLLVM()} `,
		0);
	}
}

module.exports = FloatConvert;