const Instruction = require("./instruction.js");

class Constant extends Instruction {
	/**
	 * 
	 * @param {LLVM.Type} type 
	 * @param {String}
	 * @param {BNF_Reference} ref 
	 */
	constructor(type, value, ref) {
		super (ref);
		this.type = type;
		this.val = value;
	}

	toLLVM() {
		return `${this.type.toLLVM()} ${this.val}`;
	}
}

module.exports = Constant;