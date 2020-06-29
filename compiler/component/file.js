const path = require('path');

const Function = require('./function.js');
const TypeDef  = require('./typedef.js');

// const { Namespace, Namespace_Type } = require('./namespace.js');
const Parse = require('./../parser/parse.js');
const fs = require('fs');

class File {
	constructor (project, id, filepath) {
		this.project = project;
		this.path = filepath;
		this.id = id;

		this.data = null;

		this.names = {};

		this.parse();
	}

	

	parse() {
		let data = fs.readFileSync(this.path, 'utf8');
		let syntax = Parse(data, this.path);

		// read in imports, templates, functions
		for (let element of syntax.tokens) {
			// Ignore comments
			if (element.type == "comment") {
				continue;
			}else if (element.type == "external") {
				if (element.tokens[0] == "assume"){
					for (let inner of element.tokens[1]){
						this.register(inner, true);
					}

				} else {
					console.error(`Error: Unknown external type "${element.tokens[0]}"`);
					process.exit(1);
				}
			} else {
				this.register(element);
			}
		}
	}

	register(element, external = false) {
		let space = null;
		let abstract = false;
		switch (element.type) {
			case "type_def":
				space = new TypeDef(this, element, external);
				break;
			case "function_outline":
				abstract = true;
				// continue to function case
			case "function":
				space = new Function(this, element, external, abstract);
				break;
			default:
				throw new Error(`Unexpected file scope namespace type "${element.type}"`);
		}

		if (!this.names[space.name]) {
			this.names[space.name] = space;
		} else if (
			!this.names[space.name].merge ||
			!this.names[space.name].merge(space)
		) {
			console.error("Multiple definitions of same namespace");
			console.error("  name :", space.name);
			console.error("   1st :", this.names[space.name].ref.toString());
			console.error("   2nd :", space.ref.toString());
			process.exit(1);
		}
	}

	getType(term) {
		let target = term[0];
		let res = this.names[target];
		
		if (term.length > 1 && res) {
			return res.getNameSpace( [ term[1][0], ...term.slice(2) ] );
		} else {
			return res;
		}
	}

	getID () {
		return this.id;
	}
	getFileID () {
		return this.getID();
	}
	getPath() {
		return this.path;
	}
	getRelative() {
		return path.relative(this.project.rootPath, this.path);
	}

	throw (msg, refStart, refEnd) {
		console.error(`${msg} ${refStart.toString()} -> ${refEnd.toString()}`);
		this.project.markError();
	}


	link () {
		for (let key in this.names) {
			this.names[key].link();
		}
	}


	compile() {
		let fragment = [`; ModuleID = '${this.getRelative()}'`];

		for (let key in this.names) {
			fragment.push(this.names[key].compile());
		}

		return fragment.join('\n');
	}
}

module.exports = File;