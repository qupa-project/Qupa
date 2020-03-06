const Interpret = require("../../interpreter/interpret.js");
const File = require('./file.js');

const path = require('path');
const fs = require('fs');

class Project {
	constructor (root) {
		this.root  = root;
		this.files = [];
	}

	load (filename, from) {
		if (!fs.existsSync(filename, 'utf8')) {
			console.error(`Error: Invalid import filename "${filename}"`);
			console.error(`         at ${from}`)
			process.exit(1);
		}

		let relFile = path.basename(filename);
		if (filename != this.root) {
			relFile = path.relative(this.root, filename);
		}

		this.files.push(new File(this, filename,
			Interpret(fs.readFileSync(filename, 'utf8'), relFile)
		));
	}
}



module.exports = Project;