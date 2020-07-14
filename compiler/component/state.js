class State {
	constructor (ctx) {
		this.ctx = null;

		if (ctx) {
			this.ctx = ctx.getFile();
		}
	}

	match() {
		return true;
	}
}

module.exports = State;