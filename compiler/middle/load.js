const Instruction = require("./instruction.js");

class Load extends Instruction {
	/**
	 * 
	 * @param {LLVM.Name} reg_store Where the data is being stored
	 * @param {LLVM.Type} type The type of data
	 * @param {LLVM.Name} reg_address The register which holds the address of the data
	 * @param {Number} width The width of hte data
	 * @param {BNF_Reference?} ref 
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