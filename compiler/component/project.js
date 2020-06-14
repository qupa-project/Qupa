const File = require('./file.js');
const { Generator_ID } = require('./generate.js');

class Project {
	constructor(rootPath) {
		this.rootPath = rootPath;
		this.files  = [];
		this.idGen = new Generator_ID();
	}

	import(path) {
		for (let file of this.files) {
			if (file.getPath() == path) {
				return file.getID();
			}
		}

		let temp = new File(this, this.idGen.next(), path);
		this.files.push(temp);

		return temp;
	}
}


module.exports = Project;