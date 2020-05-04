class Reference {
	constructor(line, col, internal) {
		this.line = line;
		this.col = col
		this.internal = internal;
	}
};

class SyntaxError {
	constructor(ref, remaining, branch, code=null){
		this.ref = ref;
		this.remaining = remaining;
		this.branch = branch;
		this.code = code;
	}
}
class SyntaxNode {
	constructor(type, tokens, consumed) {
		this.type     = type;
		this.tokens   = tokens;
		this.consumed = consumed;
	}
}

module.exports = {
	SyntaxNode, SyntaxError, Reference
}