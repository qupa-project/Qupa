const Flattern = require('./../parser/flattern.js');
const TypeDef = require('./typedef.js');


class Function {
	constructor (ctx, ast, external = false, abstract = false) {
		this.name = ast.tokens[0].tokens[1].tokens;
		this.ctx = ctx;
		
		this.instances = [];
		this.register(ast, external, abstract);
	}

	register(ast) {
		this.instances.push(new Function_Instance( this, ast ));
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
		throw "TODO";
	}
}

class Function_Instance {
	constructor (ctx, ast, external = false, abstract = false) {
		this.ctx = ctx;
		this.ast = ast;
		this.external = external;
		this.abstract = abstract;

		this.signature = [];

		this.name = ast.tokens[0].tokens[1].tokens;
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

			let ref = file.getNamespace(name);
			if (ref instanceof TypeDef) {
				this.signature.push([ptr, ref]);
			} else {
				if (ref == null) {
					file.throw(
						`Invalid type name "${Flattern.Variable(name)}"`,
						name.ref.start, name.ref.end
					);
				}
			}
		}
	}
}


module.exports = Function;