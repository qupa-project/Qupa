const Instruction = require("./Instruction");

class Procedure extends Instruction {
	constructor (rtrnType, name, args, attributes, ref) {
		super(ref);
		this.rtrnType = rtrnType;
		this.name = name;
		this.args = args;
		this.attributes = attributes;
		this.stmts = [];
	}

	append(instruction) {
		this.stmts.push(instruction);
	}

	merge (other) {
		this.stmts = this.stmts.concat(other.stmts);
	}

	toLLVM () {
		let out = `\ndefine dso_local ${this.rtrnType} ${this.name}(${this.args.map(x => x.toLLVM()).join(', ')}) ${this.attributes}`;
		if (this.stmts.length > 0) {
			out += ` {\n${this.stmts.map(x => x.toLLVM(2)).join("\n")}\n}`;
		}
		return out;
	}
}

module.exports = Procedure;