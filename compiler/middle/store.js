const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Store extends Instruction {
	/**
	 * 
	 * @param {LLVM.Argument} reg 
	 * @param {LLVM.Instruction} data 
	 * @param {Number} width 
	 * @param {BNF_Reference?} ref 
	 */
	constructor(reg, data, width, ref) {
		super (ref);
		this.register = reg;
		this.data     = data;
		this.width    = width;
	}

	toLLVM(indent) {
		return super.toLLVM(
			`store ${this.data.toLLVM()}, ${this.register.toLLVM()}, align ${this.width}`,
			indent
		);
	}
}

module.exports = Store;