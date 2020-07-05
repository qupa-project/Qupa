const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Set extends Instruction {
	/**
	 * 
	 * @param {LLVM.Name} register 
	 * @param {LLVM.Type} type 
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