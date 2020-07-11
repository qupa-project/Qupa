const Instruction = require("./instruction.js");

class Alloc extends Instruction {
	/**
	 * 
	 * @param {Type} type 
	 * @param {BNF_Reference} ref 
	 */
	constructor(type, size, ref) {
		super (ref);
		this.type = type;
		this.size = size;
	}

	toLLVM(indent) {
		return super.toLLVM(`alloca ${this.type.toLLVM()}, align ${this.size}`, indent);
	}
}

module.exports = Alloc;