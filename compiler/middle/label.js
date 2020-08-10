const Instruction = require("./instruction.js");
let LLVM = require('./llvm.js');

class Label extends Instruction {
	/**
	 *
	 * @param {LLVM.ID} term
	 * @param {BNF_Reference?} ref
	 */
	constructor(name, ref) {
		super (ref);
		this.name = name;
	}

	toDefinition() {
		return new Label_Definition(this.name, this.ref);
	}

	flattern() {
		return `label ${this.name.flattern()}`;
	}
}

class Label_Definition extends Label {
	assign_ID (gen) {
		this.name.assign_ID(gen);
	}

	flattern() {
		return `\n${this.name.flattern()}:`;
	}
}

module.exports = Label;