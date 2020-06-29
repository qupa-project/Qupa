const File = require('./file.js');
const { Generator_ID } = require('./generate.js');

class Project {
	constructor(rootPath) {
		this.rootPath = rootPath;
		this.files  = [];
		this.idGen = new Generator_ID();

		this.error = false;
	}

	import(path) {
		for (let file of this.files) {
			if (file.getPath() == path) {
				return file.getFileID();
			}
		}

		let temp = new File(this, this.idGen.next(), path);
		this.files.push(temp);

		return temp;
	}

	link(){
		for (let file of this.files) {
			file.link();
		}
	}

	markError() {
		this.error = true;
	};


	compile() {
		let fragment = [];
		for (let file of this.files) {
			fragment.push(file.compile());
		}

		return fragment.join("\n");
	}
}


module.exports = Project;