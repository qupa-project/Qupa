class WPad {
	constructor (lines) {
		this.lines = lines;
	}

	toLLVM() {
		let out = "";
		for (let i=0; i<this.lines; i++) {
			out += "\n";
		}

		return out;
	}
}

module.exports = WPad;