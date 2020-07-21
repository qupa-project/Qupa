const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');
const Constant = require("./constant.js");

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

	isConstant() {
		return this.name instanceof Constant;
	}

	toLLVM() {
		return `${this.type.toLLVM()} ${this.name.toLLVM()}`;
	}
}

module.exports = Argument;