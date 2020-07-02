const Instruction = require("./Instruction");

class Set extends Instruction {
	/**
	 * 
	 * @param {Name} register 
	 * @param {Type} type 
	 * @param {BNF_Reference} ref 
	 */
	constructor(name, expr, ref) {
		super (ref);
		this.register = name;
		this.expr = expr;
	}

	toLLVM(indent) {
		return super.toLLVM(`${this.register.toLLVM()} = ${this.expr.toLLVM()}`, indent);
	}
}

module.exports = Set;