const { Generator_ID } = require('./generate.js');

const Flattern = require('./../parser/flattern.js');
const TypeDef = require('./typedef.js');


let funcIDGen = new Generator_ID();


class Function {
	constructor (ctx, ast, external = false, abstract = false) {
		this.name = ast.tokens[0].tokens[1].tokens;
		this.ctx = ctx;

		this.ref = ast.ref.start;
		
		this.instances = [];
		this.register(ast, external, abstract);
	}

	getFileID() {
		return this.ctx.getFileID();
	}

	register(ast, external = false, abstract = false) {
		this.instances.push(new Function_Instance( this, ast, external, abstract ));
	}

	merge(){
		return false;
	}

	link() {
		for (let instance of this.instances) {
			instance.link();
		}

		return;
	}

	compile() {
		let fragment = [`\n; Function Group "${this.name}":`];

		for (let instance of this.instances) {
			fragment.push(instance.compile());
		}

		return fragment.join('\n');
	}
}

class Function_Instance {
	constructor (ctx, ast, external = false, abstract = false) {
		this.ctx = ctx;
		this.ast = ast;
		this.ref = ast.ref.start;
		this.external = external;
		this.abstract = abstract;

		this.signature = [];

		this.id = funcIDGen.next();

		this.name = ast.tokens[0].tokens[1].tokens;
		this.represent = external ? this.name : `${this.name}@${this.ctx.getFileID().toString(36)}.${this.id.toString(36)}`;
	}

	link () {
		let file = this.ctx.ctx;
		let head = this.ast.tokens[0];
		let args = head.tokens[2].tokens;

		// Flaten signature types AST into a single array
		let types = [ head.tokens[0] ];
		if (args.length > 0) {
			types = types.concat(args.map((x) => {
				return x[0];
			}));
		}

		for (let type of types){
			let name = null;
			let ptr = false;
			if (type.tokens[0].type == "variable") {
				name = type.tokens[0];
			} else {
				name = type.tokens[0].tokens[1];
				if (type.tokens[0].type == "pointer") {
					ptr = true;
				}
			}

			let ref = file.getType(Flattern.VariableList(name));
			if (ref instanceof TypeDef) {
				this.signature.push([ptr, ref]);
			} else {
				if (ref == null) {
					file.throw(
						`Invalid type name "${Flattern.VariableStr(name)}"`,
						name.ref.start, name.ref.end
					);
				}
			}
		}
	}

	compile() {
		let rtrnType = ( this.signature[0][0] ? "@" : "" ) + this.signature[0][1].represent;
		let out = `define dso_local ${rtrnType} "${this.represent}"`;

		out += "(";
		for (let i=1; i<this.signature.length; i++) {
			if (i != 1) {
				out += ", ";
			}
			out += ( this.signature[i][0] ? "@" : "" ) + this.signature[i][1].represent;
		}
		out += ") #1"

		if (!this.abstract && !this.external) {
			out += " {\n";
			out += this.compileInner();
			out += "\n}";
		}

		return out;
	}

	compileInner() {
		return "  ; TODO";
	}
}


module.exports = Function;