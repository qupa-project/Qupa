const Instruction = require("./Instruction");

class Call extends Instruction {
	constructor (store_register, rtrnType, name, args, ref) {
		super(ref);
		this.store = store_register || null;
		this.rtrnType = rtrnType;
		this.name = name;
		this.args = args;
	}

	toLLVM (indent) {
		let out = "";
		if (this.store) {
			out = `${this.store.toLLVM()} = `
		}
		out += `call ${this.rtrnType.toLLVM()} ${this.name.toLLVM()} (${this.args.map(x=>x.toLLVM()).join(",")})`;

		return super.toLLVM(
			out,
			indent
		);
	}
}

module.exports = Call;