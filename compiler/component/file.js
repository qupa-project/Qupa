const Parse = require('./../parser/parse.js');
const fs = require('fs');

class File {
	constructor (project, id, filepath) {
		this.project = project;
		this.path = filepath;
		this.id = id;

		this.parse();
	}

	parse() {
		let data = fs.readFileSync(this.path, 'utf8');
		let syntax = Parse(data, this.path);

		// read in imports, templates, functions
	}

	getID () {
		return this.id;
	}
	getPath() {
		return this.path;
	}
}

module.exports = File;