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
	constructor(type, reg_address, ref) {
		super (ref);
		this.type    = type;
		this.address = reg_address;
	}

	toLLVM(indent) {
		return super.toLLVM(
			`load ${this.type.toLLVM()}, ${this.type.toLLVM()}* ${this.address.toLLVM()}, align 4`,
			indent
		);
	}
}

module.exports = Load;