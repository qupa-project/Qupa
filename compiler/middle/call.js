const Instruction = require("./Instruction");

class Call extends Instruction {
	constructor (rtrnType, name, args, ref) {
		super(ref);
		this.rtrnType = rtrnType;
		this.name = name;
		this.args = args;
	}

	toLLVM (indent) {
		return super.toLLVM(
			`call ${this.rtrnType.toLLVM()} ${this.name.toLLVM()}(${this.args.map(x=>x.toLLVM()).join(",")})`,
			indent
		);
	}
}

module.exports = Call;