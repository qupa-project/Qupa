const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Argument extends Instruction {
	/**
	 * 
	 * @param {LLVM.Type} type 
	 * @param {LLVM.Name} name 
	 * @param {BNF_Reference?} ref 
	 * @param {String?} originalName 
	 */
	constructor(type, name, ref, originalName) {
		super(ref);
		this.type   = type;
		this.name   = name;
		this.origin = originalName;
	}

	toLLVM() {
		return `${this.type.toLLVM()} ${this.name.toLLVM()}`;
	}
}

module.exports = Argument;