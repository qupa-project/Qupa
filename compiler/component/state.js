class State {
	constructor (ctx) {
		this.ctx = ctx.getFile();
	}

	match() {
		return true;
	}
}

module.exports = State;