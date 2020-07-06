const Instruction = require("./instruction.js");
let LLVM = require('./llvm.js');

class Label extends Instruction {
	/**
	 * 
	 * @param {LLVM.Name} term 
	 * @param {BNF_Reference?} ref 
	 */
	constructor(name, ref) {
		super (ref);
		this.name = name;
	}

	toDefinition() {
		return new Label_Definition(this.name, this.ref);
	}

	toLLVM() {
		return `label ${this.name.toLLVM()}`;
	}
}

class Label_Definition extends Label {
	toLLVM() {
		return `\n${this.name.term}:`;
	}
}

module.exports = Label;