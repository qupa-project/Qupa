const Instruction = require("./Instruction");

class Alloc extends Instruction {
	/**
	 * 
	 * @param {Name} register 
	 * @param {Type} type 
	 * @param {BNF_Reference} ref 
	 */
	constructor(name, type, ref) {
		super (ref);
		this.register = name;
		this.type = type;
	}

	toLLVM(indent) {
		return super.toLLVM(`${this.register.toLLVM()} = alloca ${this.type.toLLVM()}`, indent)
	}
}

module.exports = Alloc;