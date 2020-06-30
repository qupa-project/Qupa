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

	merge(other){
		for (let instance of this.instances) {
			if (instance.match(other.instances[0])) {
				return false;
			}
		}

		this.instances = this.instances.concat( other.instances );

		return true;
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
		this.represent = external ? `"${this.name}"` : `"${this.name}@${this.ctx.getFileID().toString(36)}.${this.id.toString(36)}"`;
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
				} else {
					file.throw(
						`Unexpected data type form "${typeof(ref)}"`,
						name.ref.start, name.ref.end
					);
				}
			}
		}
	}

	match (other) {
		let a = this.ast.tokens[0].tokens[2].tokens;
		let b = other.ast.tokens[0].tokens[2].tokens;
		if (this.signature.length > 0 && other.signature.length > 0) {
			a = this.signature.slice(1);  // ignore output
			b = other.signature.slice(1); // ignore output
		}


		if (a.length != a.length) {
			return false;
		}

		for (let i=0; i<a.length; i++) {
			if (a[i] != b[i]) {
				return false;
			}
		}


		return true;
	}

	getTypeFrom_DataType(type) {
		let file = this.ctx.ctx;
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
			return [ptr, ref];
		} else {
			return null;
		}
	}

	compile() {
		let rtrnType = ( this.signature[0][0] ? "@" : "" ) + this.signature[0][1].represent;
		let out = `define dso_local ${rtrnType} ${this.represent}`;

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
			out += this.compileBody();
			out += "\n}";
		}

		return out;
	}

	compileBody() {
		let regCounter = new Generator_ID(1);
		let variable = {};

		let ir = "";

		console.log(132, this.represent);
		let stack = this.ast.tokens[1].tokens;
		for (let token of stack) {
			// console.log(139, token.tokens);

			switch (token.type) {
				case "declare":
					let typeRef = this.getTypeFrom_DataType(token.tokens[0]);
					let name = token.tokens[1].tokens;

					if (variable[name]) {
						file.throw(
							`Redefinition of local variable "${name}"`,
							variable[name].declared, token.ref.end
						);
						return "";
					} else {
						variable[name] = {
							pointer: typeRef[0],
							type: typeRef[1],
							register: regCounter.next(),
							declared: token.ref.start
						};

						ir += `  %${variable[name].register} = alloca ${variable[name].type.represent} ; ${name}\n`;
						if (variable[name].pointer) {
							file.throw(
								`Unhandled register type @${variable[name].type.represent}`,
								variable[name].declared, token.ref.end
							);
							return "";
						}
					}

					break;
				case "assign":
					let target = variable[Flattern.VariableStr(token.tokens[0])];
					if (!target) {
						file.throw(
							`Undefined variable "${Flattern.VariableStr(token.tokens[0])}"`,
							token.ref.start, token.ref.end
						);
						return "";
					}

					console.log(166, target.type);

					ir += `  store i32 0, ${target.type.represent}* %${target.register}, align ${target.type.size}\n`;

					break;
				case "return":
					ir += "  ; TODO return";
					break;
				default:
					console.error(`Error: Unknown function statement "${token.type}"`);
			}
		}

		return ir;
	}
}


module.exports = Function;