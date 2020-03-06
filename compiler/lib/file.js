const path = require('path');

class File {
	constructor(project, filename, imr) {
		this.project = project;
		
		this.filename = filename;
		this.dir = path.dirname(this.filename);
		this.imr = imr;

		for (let include of this.imr.imports) {
			let source = include.type == "import.direct" ? include.tokens[1].data : include.tokens[2].data;
			source = path.join(this.dir, source);

			this.project.load(
				source,
				include.tokens[0].reference.toString()
			);
		}
	}
}


module.exports = File;