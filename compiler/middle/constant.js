const Instruction = require("./instruction.js");

class Constant extends Instruction {
	/**
	 *
	 * @param {LLVM.Type} type
	 * @param {String}
	 * @param {BNF_Reference} ref
	 */
	constructor(value, ref) {
		super (ref);
		this.val = value;
	}

	toLLVM() {
		return `${this.val}`;
	}
}

module.exports = Constant;