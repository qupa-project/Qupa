const Instruction = require("./Instruction");

class Load extends Instruction {
	/**
	 * 
	 * @param {LLVM.Name} reg 
	 * @param {LLVM.Type} regType 
	 * @param {String} data 
	 * @param {LLVM.Type} dataType 
	 * @param {Number} width 
	 * @param {BNF_Reference} ref 
	 */
	constructor(reg_store, type, reg_address, width, ref) {
		super (ref);
		this.type    = type;
		this.store   = reg_store;
		this.address = reg_address;
		this.width   = width;
	}

	toLLVM(indent) {
		return super.toLLVM(
			`${this.store.toLLVM()} = load ${this.type.toLLVM()}, ${this.type.toLLVM()}* ${this.address.toLLVM()}, align ${this.width}`,
			indent
		);
	}
}

module.exports = Load;