function* IDGenerator() {
	let state = 0;
	while (true) {
		yield state++;
	}
}

class Generator_ID {
	constructor() {
		this.internal = IDGenerator();
	}

	next() {
		return this.internal.next().value;
	}
}

module.exports = {
	Generator_ID
};