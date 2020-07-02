const path = require('path');
const BNF = require('BNF-parser');

const LLVM = require('./../middle/llvm.js');
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

		this.data = "";

		this.names = {};

		this.exports = [];

		this.parse();
	}

	

	parse() {
		this.data = fs.readFileSync(this.path, 'utf8').replace(/\n\r/g, '\n');
		let syntax = Parse(this.data, this.path);

		// read in imports, templates, functions
		for (let element of syntax.tokens) {
			// Ignore comments
			if (element.type == "comment") {
				continue;
			}else if (element.type == "external") {
				if (element.tokens[0] == "assume") {
					for (let inner of element.tokens[1]){
						this.register(inner, true);
					}
				} else if (element.tokens[0] == "export") {
					for (let inner of element.tokens[1]){
						this.exports.push(inner);
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
				abstract = !external;
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

	/**
	 * Must be ran after main linking
	 * @param {BNF_SyntaxNode} element 
	 */
	registerExport(element) {
		if (element.type != "function_outline") {
			this.getFile().throw(`Link Error: Unable to export non-functions in current version`, element.ref.start);
			return;
		}

		let space = new Function(this, element, true, false);
		space.link();

		if (!this.project.registerExport(space.name)) {
			this.getFile().throw(
				`Link Error: Unable to export "${space.name}" as name is already in use`,
				space.ref
			);
		}

		if (this.names[space.name]) {
			this.names[space.name].registerExport(space.instances[0]);
		} else {
			this.getFile().throw(`Link Error: Unable to export function "${space.name}"`, element.ref.start);
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

	getFunction(variable, signature) {
		let first = variable.tokens[0].tokens;
		if (this.names[first]) {
			if (this.names[first] instanceof Function && variable.tokens.length == 1) {
				return this.names[first].matchSignature(signature);
			}	
		}

		return null;
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

	getFile() {
		return this;
	}

	throw (msg, refStart, refEnd) {
		let area = BNF.Message.HighlightArea(this.data, refStart, refEnd, 2);

		if (refEnd) {
			console.error(`${msg} ${refStart.toString()} -> ${refEnd.toString()}`);
		} else {
			console.error(`${msg} ${refStart.toString()}`);
		}
		console.error(area);
		this.project.markError();
	}


	link () {
		for (let key in this.names) {
			this.names[key].link();
		}

		for (let external of this.exports) {
			this.registerExport(external);
		}
	}


	compile() {
		let fragment = new LLVM.Fragment();
		fragment.append(new LLVM.Comment(`ModuleID = '${this.getRelative()}'`));

		for (let key in this.names) {
			fragment.append(this.names[key].compile());
		}

		return fragment;
	}
}

module.exports = File;