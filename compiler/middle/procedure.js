const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');

class Procedure extends Instruction {
	/**
	 * 
	 * @param {LLVM.Type} rtrnType 
	 * @param {LLVM.Name} name 
	 * @param {LLVM.Argument[]} args 
	 * @param {String} attributes 
	 * @param {Boolean} external 
	 * @param {BNF_Reference?} ref 
	 */
	constructor (rtrnType, name, args, attributes, external, ref) {
		super(ref);
		this.rtrnType = rtrnType;
		this.name = name;
		this.args = args;
		this.attributes = attributes;
		this.external = external;
		this.stmts = [];
	}

	append(instruction) {
		this.stmts.push(instruction);
	}

	merge (other) {
		this.stmts = this.stmts.concat(other.stmts);
	}

	toLLVM () {
		let out = `${this.external ? "declare" : "define"} dso_local ${this.rtrnType.toLLVM()} ${this.name.toLLVM()}(${this.args.map(x => x.toLLVM()).join(', ')}) ${this.attributes}`;
		if (this.stmts.length > 0) {
			out += ` {\n${this.stmts.map(x => x.toLLVM(2)).join("\n")}\n}`;
		}
		return out;
	}
}

module.exports = Procedure;