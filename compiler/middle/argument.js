const Instruction = require("./Instruction");

class Argument extends Instruction {
	constructor(type, name, ref, originalName) {
		super(ref);
		this.type   = type;
		this.name   = name;
		this.origin = originalName;
	}

	toLLVM() {
		return `${this.type.toLLVM()} ${this.name.toLLVM()}`;
	}
}

module.exports = Argument;