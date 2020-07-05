const Instruction = require("./instruction.js");

class Name extends Instruction {
	/**
	 * 
	 * @param {String} term 
	 * @param {Boolean} global 
	 * @param {BNF_Reference?} ref 
	 */
	constructor(term, global, ref) {
		super (ref);
		this.term = term;
		this.isGlobal = global;
	}

	toLLVM() {
		return `${this.isGlobal ? "@" : "%"}${this.term}`;
	}
}
module.exports = Name;