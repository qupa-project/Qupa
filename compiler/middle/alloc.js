const Instruction = require("./Instruction");

class Alloc extends Instruction {
	/**
	 * 
	 * @param {Name} register 
	 * @param {Type} type 
	 * @param {BNF_Reference} ref 
	 */
	constructor(type, ref) {
		super (ref);
		this.type = type;
	}

	toLLVM(indent) {
		return super.toLLVM(`alloca ${this.type.toLLVM()}`, indent)
	}
}

module.exports = Alloc;