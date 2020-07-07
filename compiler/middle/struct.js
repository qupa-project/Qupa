const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Name extends Instruction {
	/**
	 * 
	 * @param {LLVM.Name} name 
	 * @param {LLVM.Type[]} terms 
	 * @param {BNF_Reference} ref 
	 */
	constructor(name, terms, ref) {
		super (ref);
		this.name = name;
		this.terms = terms;
	}

	toLLVM(indent) {
		return super.toLLVM(`${this.name.toLLVM().slice(1)} = type { ${this.terms.map( x => x.toLLVM() ).join(", ")} }`, indent);
	}
}
module.exports = Name;