const Instruction = require("./Instruction");

class Store extends Instruction {
	/**
	 * 
	 * @param {LLVM.Name} reg 
	 * @param {LLVM.Type} regType 
	 * @param {String} data 
	 * @param {LLVM.Type} dataType 
	 * @param {Number} width 
	 * @param {BNF_Reference} ref 
	 */
	constructor(regType, reg, dataType, data, width, ref) {
		super (ref);
		this.registerType = regType;
		this.register     = reg;
		this.dataType     = dataType;
		this.data         = data;
		this.width        = width;
	}

	toLLVM(indent) {
		return super.toLLVM(
			`store ${this.dataType.toLLVM()} ${this.data}, ${this.registerType.toLLVM()}* ${this.register.toLLVM()}, align ${this.width}`,
			indent
		);
	}
}

module.exports = Store;