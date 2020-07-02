const Instruction = require('./instruction.js');

class Return extends Instruction {
	constructor (expr, ref) {
		super(ref);
		this.expr = expr;
	}

	toLLVM(indent) {
		return super.toLLVM(`ret ${this.expr.toLLVM()}`, indent);
	}
}

module.exports = Return;