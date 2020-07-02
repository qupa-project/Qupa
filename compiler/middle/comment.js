const Instruction = require('./instruction.js');

class Comment extends Instruction {
	constructor (text, ref) {
		super(ref);
		this.text = text;
	}

	toLLVM(indent) {
		return super.toLLVM(`; ${this.text}`, indent);
	}
}

module.exports = Comment;