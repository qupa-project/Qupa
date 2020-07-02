class Instruction {
	constructor(ref) {
		this.ref = ref;
	}

	toLLVM(str = "", indent = 0) {
		let out = "";
		for (let i=0; i<indent; i++) {
			out += " ";
		}

		return out+str;
	}
}
module.exports = Instruction;