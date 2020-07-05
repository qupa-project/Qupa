const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Store extends Instruction {
	/**
	 * 
	 * @param {LLVM.Type} regType 
	 * @param {LLVM.Name} regName 
	 * @param {LLVM.Instruction} data 
	 * @param {Number} width 
	 * @param {BNF_Reference?} ref 
	 */
	constructor(regType, regName, data, width, ref) {
		super (ref);
		this.registerType = regType;
		this.register     = regName;
		this.data         = data;
		this.width        = width;
	}

	toLLVM(indent) {
		return super.toLLVM(
			`store ${this.data.toLLVM()}, ${this.registerType.toLLVM()}* ${this.register.toLLVM()}, align ${this.width}`,
			indent
		);
	}
}

module.exports = Store;