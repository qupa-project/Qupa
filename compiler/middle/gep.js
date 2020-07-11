const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class GEP extends Instruction {
	/**
	 * 
	 * @param {LLVM.Type} type 
	 * @param {LLVM.Name} reg_address 
	 * @param {LLVM.Constant[]} cnst_term 
	 * @param {BNF_Reference} ref 
	 */
	constructor(type, reg_address, cnst_term, ref) {
		super (ref);
		this.type = type;
		this.address = reg_address;
		this.term = cnst_term;
	}

	toLLVM(indent) {
		return super.toLLVM(
			`getelementptr inbounds ` +
			`${this.type.toLLVM()}, ` +
			`${this.type.toLLVM()}* ${this.address.toLLVM()}, ` +
			`${this.term.map(x=>x.toLLVM()).join(', ')}`,
		indent);
	}
}

module.exports = GEP;