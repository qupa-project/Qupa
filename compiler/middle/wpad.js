class WPad {
	/**
	 * 
	 * @param {Number} lines 
	 */
	constructor (lines) {
		this.lines = lines;
	}

	toLLVM() {
		let out = "";
		for (let i=0; i<this.lines-1; i++) {
			out += "\n";
		}

		return out;
	}
}

module.exports = WPad;