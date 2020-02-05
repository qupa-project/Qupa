class CodeReference {
	constructor(column, line, file){
		this.column = column;
		this.line = line;
		this.file = file;
	}

	toString() {
		return `"${this.file}" (${this.line}:${this.column})`;
	}
}

module.exports = CodeReference;