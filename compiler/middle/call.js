const Instruction = require("./instruction.js");
const LLVM = require('./llvm.js');


class Call extends Instruction {
	/**
	 *
	 * @param {LLVM.Type} rtrnType
	 * @param {LLVM.Name} name
	 * @param {LLVM.Argument[]} args
	 * @param {BNF_Reference?} ref
	 */
	constructor (rtrnType, name, args, ref) {
		super(ref);
		this.type = rtrnType;
		this.name = name;
		this.args = args;
	}

	toLLVM (indent) {
		return super.toLLVM(
			`call ${this.type.toLLVM()} ${this.name.toLLVM()}(${this.args.map(x=>x.toLLVM()).join(",")})`,
			indent
		);
	}
}

module.exports = Call;