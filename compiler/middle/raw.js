class Raw {
	/**
	 * 
	 * @param {String} text 
	 */
	constructor (text) {
		this.text = text;
	}

	toLLVM() {
		return this.text;
	}
}

module.exports = Raw;