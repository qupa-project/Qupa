const Instruction = require("./Instruction.js");

class Constant extends Instruction {
	/**
	 * 
	 * @param {Name} register 
	 * @param {Type} type 
	 * @param {BNF_Reference} ref 
	 */
	constructor(type, value, ref) {
		super (ref);
		this.type = type;
		this.val = value;
	}

	toLLVM() {
		return `${this.type} ${this.val}`;
	}
}

module.exports = Constant;