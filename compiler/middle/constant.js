const Instruction = require("./instruction.js");

class Constant extends Instruction {
	/**
	 * 
	 * @param {String} type 
	 * @param {String}
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