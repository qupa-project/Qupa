const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Bitcast extends Instruction {
	/**
	 * 
	 * @param {LLVM.Type} type 
	 * @param {LLVM.Argument} target 
	 * @param {BNF_Reference} ref 
	 */
	constructor(type, target, ref) {
		super (ref);
		this.target = target;
		this.type   = type;
	}

	toLLVM() {
		return super.toLLVM(
			`bitcast ` +
			`${this.target.toLLVM()} to ` +
			`${this.type.toLLVM()}`,
		0);
	}
}

module.exports = Bitcast;