const LLVM = require('./../middle/llvm.js');
const TypeDef = require('./typedef.js');
const Flattern = require('../parser/flattern.js');


class Struct_Term {
	constructor(name, type, pointerLvl, ref) {
		this.name = name;
		this.type = type;
		this.pointer = pointerLvl;
		this.declared = ref;
		this.size = pointerLvl > 0 ? 8 : type.size;
	}
}


class Structure extends TypeDef {
	constructor (ctx, ast, external = false) {
		super(ctx, ast, external);
		this.terms = [];
		this.linked = false;
	}

	/**
	 * 
	 * @param {String} name 
	 * @returns {Object}
	 */
	getTerm(name) {
		let found = false;
		let i = 0;
		for (; i<this.terms.length && !found; i++) {
			if (this.terms[i].name == name) {
				found = true;
				break;
			}
		}

		if (!found) {
			return null;
		}

		return {
			index: i,
			term: this.terms[i]
		};
	}

	parse() {
		this.name = this.ast.tokens[0].tokens;
		this.represent = "%struct." + (
			this.external ? this.name : `${this.name}.${this.ctx.getFileID().toString(36)}`
		);
	}

	link(stack = []) {
		if (stack.indexOf(this) != -1) {
			this.ctx.getFile().throw(
				`Error: Structure ${this.name} contains itself, either directly or indirectly`,
				this.ast.ref.start,
				this.ast.ref.end
			);
			return;
		}
		if (this.linked) {
			return;
		}

		let termNames = [];
		this.linked = true;
		this.size = 0;
		for (let node of this.ast.tokens[1].tokens) {
			let name = node.tokens[1].tokens;
			if (termNames.indexOf(name) != -1) {
				this.ctx.getFile().throw(
					`Error: Multiple use of term ${name} in struct`,
					this.terms[name].declared,
					node.ref.end
				);
				return;
			}

			let typeNode = node.tokens[0].tokens[0];
			let pointerLvl = 0;
			if (typeNode.type == "pointer") {
				pointerLvl = typeNode.tokens[0];
				typeNode = typeNode.tokens[1];
			}

			let type = this.ctx.getType(Flattern.VariableList(typeNode));
			if (type === null) {
				this.ctx.getFile().throw(
					`Error: Unknown type ${Flattern.VariableStr(typeNode)}`,
					typeNode.ref.start,
					typeNode.ref.end
				);
				return;
			}
			if (!type.linked) {
				type.link([this, ...stack]);
			}
			let term = new Struct_Term(name, type, pointerLvl, node.tokens[0].tokens[0].ref.start);
			this.terms.push(term);
			this.size += term.size;
		}
	}

	compile() {
		let types = [];
		for (let name in this.terms) {
			types.push(new LLVM.Type(
				this.terms[name].type.represent,
				this.terms[name].pointer,
				this.terms[name].declared
			));
		}

		return new LLVM.Struct(
			new LLVM.Name(this.represent, false, this.ref),
			types,
			this.ref
		);
	};
}

module.exports = Structure;