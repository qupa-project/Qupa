const Instruction = require("./instruction.js");

class Alloc extends Instruction {
	/**
	 *
	 * @param {Type} type
	 * @param {BNF_Reference} ref
	 */
	constructor(type, ref) {
		super (ref);
		this.type = type;
	}

	toLLVM(indent) {
		return super.toLLVM(`alloca ${this.type.toLLVM()}, align 4`, indent);
	}
}

module.exports = Alloc;