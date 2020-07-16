const path = require('path');
const BNF = require('bnf-parser');

const LLVM = require('./../middle/llvm.js');
const Function = require('./function.js');
const TypeDef  = require('./typedef.js');
const Structure = require('./struct.js');
const Import  = require('./import.js');
const Alias  = require('./alias.js');

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

		let prim = this.project.getPrimative();
		if (prim) {
			let lib = new Import(this, null);
			lib.inject(prim);
			this.names["*"] = lib;
		}

		this.exports = [];
		this.imports = [];
	}

	

	parse() {
		console.info("Parsing:", this.path);

		// Check the file exists
		if (!fs.existsSync(this.path)) {
			let msg = "\n";
			msg += `Error: Cannot import file, as it does not exist\n`;
			msg += `  absolute: ${this.path}\n`;
			msg += `  relative: ${this.getRelative()}\n`;

			console.error(msg);
			this.project.markError(msg);
			return;
		}

		if (!fs.lstatSync(this.path).isFile()) {
			let msg = "\n";
			msg += `Error: Cannot import directory as a file\n`;
			msg += `  absolute: ${this.path}\n`;
			msg += `  relative: ${this.getRelative()}\n`;

			console.error(msg);
			this.project.markError(msg);
			return;
		}

		this.data = fs.readFileSync(this.path, 'utf8').replace(/\n\r/g, '\n');
		let syntax = Parse(this.data, this.path);

		// read in imports, templates, functions
		for (let element of syntax.tokens) {
			// Ignore comments
			if (element.type == "comment") {
				continue;
			} else if (element.type == "external") {
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
					this.project.markError();
					return false;
				}
			} else if (element.type == "library") {
				let inner = element.tokens[0];
				if (inner.type == "import") {
					inner.tokens = [
						path.resolve(
							path.dirname(this.path),
							inner.tokens[0].tokens[1]
						),
						inner.tokens[1]
					];
					this.register(inner);
				} else {
					console.error(`  Parse Error: Unknown library action "${inner.type}"`);
					this.project.markError();
					return false;
				}
			} else {
				this.register(element);
			}
		}

		// After main parse
		//   To make logging clearer
		for (let name in this.names) {
			if (this.names[name] instanceof Import) {
				this.names[name].load();
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
			case "import":
				space = new Import(this, element);
				break;
			case "alias":
				space = new Alias(this, element);
				break;
			case "struct":
				space = new Structure(this, element);
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
			console.log(150, this);
			console.error("Multiple definitions of same namespace");
			console.error("  name :", space.name);
			console.error("   1st :", this.names[space.name].ref.toString());
			console.error("   2nd :", space.ref.toString());
			this.project.markError();
			return false;
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

	getType(variable) {
		let target = variable[0];
		let res = this.names[target];

		if (res instanceof Alias) {
			res = res.resolve();
		}

		if (res && variable.length > 1) {
			if (variable[1][0] != ".") {
				return null;
			}

			return res.getType( [ variable[1][1], ...variable.slice(2) ] );
		}

		if (res) {
			return res;
		} else {
			// If the name isn't defined in this file
			// Check other files
			if (this.names["*"] instanceof Import) {
				return this.names["*"].getType(variable);
			}

			return null;
		}
	}

	getFunction(variable, signature) {
		if (variable.length < 1) {
			return null;
		}

		let first = variable[0];
		let forward = variable.slice(1);
		if (Array.isArray(first)) {
			if (first[0] == ".") {
				first = first[1];
			} else {
				return null;
			}
		}

		if (this.names[first.tokens]) {
			return this.names[first.tokens].getFunction(forward, signature);
		}

		// If the name isn't defined in this file in a regular name space
		//   Check namespace imports
		if (this.names["*"] instanceof Import) {
			return this.names["*"].getFunction(variable, signature);
		}

		return null;
	}

	getMain() {
		return this.names['main'];
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
	import(filename) {
		return this.project.import(filename);
	}

	throw (msg, refStart, refEnd) {
		let area = BNF.Message.HighlightArea(this.data, refStart, refEnd);
		console.error(`\n${this.path}:`);
		if (refEnd) {
			console.error(`${msg} ${refStart.toString()} -> ${refEnd.toString()}`);
		} else {
			console.error(`${msg} ${refStart.toString()}`);
		}
		console.error(area.replace(/\t/g, '  '));
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