const Instruction = require('./instruction.js');
const LLVM = require('./llvm.js');

class Return extends Instruction {
	/**
	 * 
	 * @param {LLVM.Fragment|LLVM.Instruction} expr 
	 * @param {BNF_Reference} ref 
	 */
	constructor (expr, ref) {
		super(ref);
		this.expr = expr;
	}

	toLLVM(indent) {
		return super.toLLVM(`ret ${this.expr.toLLVM()}`, indent);
	}
}

module.exports = Return;