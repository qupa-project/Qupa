class Raw {
	constructor (text) {
		this.text = text;
	}

	toLLVM() {
		return this.text;
	}
}

module.exports = Raw;