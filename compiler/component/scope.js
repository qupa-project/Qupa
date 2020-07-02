const { Generator_ID } = require('./generate.js');
const LLVM = require("../middle/llvm");
const Flattern = require('../parser/flattern.js');

class Scope {
	constructor(ctx, id_generator = new Generator_ID()) {
		this.ctx       = ctx;
		this.variables = {};
		this.caches    = {};
		this.generator = id_generator;
	}

	register_Var(type, isPointer, name, ref) {
		if (this.variables[name]) {
			this.ctx.getFile().throw(
				`Duplicate declaration of name ${name} in scope`,
				this.variables[name].declared, ref
			);
		}

		let regID = this.generator.next();
		this.variables[name] = {
			pointer  : isPointer,
			type     : type,
			register : regID,
			declared : ref
		};

		return regID;
	}

	getVarCache(name) {
		let instructions = new LLVM.Fragment();

		// Define the cache if it doesn't already exist
		if (!this.caches[name]) {
			this.caches[name] = {
				register: this.generator.next(),
				modified: true
			};
		}

		// If the original value has been changed
		// Run the instructions to refresh the cache
		if (this.caches[name].modified) {
			instructions.append(new LLVM.Load(
				new LLVM.Name(this.caches[name].register, false),
				new LLVM.Type(this.variables[name].type.represent, this.variables[name].pointer, this.variables[name].declared),
				new LLVM.Name(this.variables[name].register),
				this.variables[name].type.size
			));

			this.caches[name].modified = false;
		}

		return {
			instructions: instructions,
			register: this.caches[name].register
		};
	}


	compile_constant(ast) {
		let type = "i32";
		let val = ast.tokens[0].tokens;
		if (ast.tokens[0].type == "float") {
			type = "double";
		} else if (ast.tokens[0].type == "boolean") {
			type = "i1";
			val = val == "true" ? 1 : 0;
		}

		return new LLVM.Constant(type, val, ast.ref.start);
	}



	compile_declare(ast){
		let typeRef = this.ctx.getTypeFrom_DataType(ast.tokens[0]);
		let	name = ast.tokens[1].tokens;
		let frag = new LLVM.Fragment();

		if (typeRef == null) {
			let typeName = Flattern.DataTypeStr(ast.tokens[0]);

			this.ctx.getFile().throw(`Error: Invalid type name "${typeName}"`, ast.ref.start, ast.ref.end);
			process.exit(1);
		}

		this.register_Var(
			typeRef[1],
			typeRef[0],
			name,
			ast.ref.start
		);

		frag.append(new LLVM.Set(
			new LLVM.Name(this.variables[name].register, false, ast.tokens[1].ref.start),
			new LLVM.Alloc(
				new LLVM.Type(this.variables[name].type.represent, false, ast.tokens[0].ref.start),
				ast.ref.start
			),
			ast.ref.start
		));

		if (this.variables[name].pointer) {
			this.ctx.getFile().throw(
				`Unhandled variable type @${variable[name].type.represent}`,
				variable[name].declared, token.ref.end
			);
			return frag;
		}

		return frag;
	}
	compile_assign(ast){
		let frag = new LLVM.Fragment();

		let name = Flattern.VariableStr(ast.tokens[0]);
		let target = this.variables[name];
		if (!target) {
			this.ctx.getFile().throw(
				`Undefined variable "${name}"`,
				ast.ref.start, ast.ref.end
			);
			return false;
		}

		switch (ast.tokens[1].type) {
			case "constant":
				// let type = "i32";
				// let val = ast.tokens[1].tokens[0].tokens;
				// if (ast.tokens[1].tokens[0].type == "float") {
				// 	type = "double";
				// } else if (ast.tokens[1].tokens[0].type == "boolean") {
				// 	type = "i1";
				// 	val = val == "true" ? 1 : 0;
				// }
				let cnst = this.compile_constant(ast.tokens[1]);

				frag.append(new LLVM.Store(
					new LLVM.Type(target.type.represent, false),
					new LLVM.Name(target.register, false),
					cnst,
					target.type.size,
					ast.ref.start
				));
				if (this.caches[name]) {
					this.caches[name].modified = true;
				}
				break;
			case "call":
				let inner_frag = this.compile_call(ast.tokens[1]);
				let call = inner_frag.stmts.splice(-1, 1)[0];
				frag.merge(inner_frag);
				frag.append(new LLVM.Set(new LLVM.Name(target.register, false), call));
				break;
			default:
				file.throw(
					`Unexpected assignment type "${ast.tokens[1].type}"`,
					ast.ref.start, ast.ref.end
				);
		}

		return frag;
	}
	compile_return(ast){
		let frag = new LLVM.Fragment();
		console.log(ast);

		let inner = null;
		switch (ast.tokens[0].type) {
			case "constant":
				inner = this.compile_constant(ast.tokens[0]);
				break;
			default:
				file.throw(
					`Unexpected return expression type "${ast.tokens[1].type}"`,
					ast.ref.start, ast.ref.end
				);
		}

		frag.append(new LLVM.Return(inner, ast.ref.start));

		return frag;
	}
	compile_call(ast) {
		let frag = new LLVM.Fragment();

		let signature = [];
		for (let arg of ast.tokens[1].tokens) {
			let name = Flattern.VariableStr(arg);
			let target = this.variables[name];
			if (!target) {
				this.ctx.getFile().throw(
					`Undefined variable name ${name}`,
					arg.ref.start, arg.ref.end
				);
				return frag;
			}

			signature.push([target.pointer, target.type]);
		}

		let target = this.ctx.getFile().getFunction(ast.tokens[0], signature);
		if (target) {
			let args = [];
			for (let arg of ast.tokens[1].tokens) {
				let name = Flattern.VariableStr(arg);
				let term = this.variables[ name ];

				let cache = this.getVarCache(name);
				frag.merge(cache.instructions);

				args.push(new LLVM.Argument(
					new LLVM.Type(
						term.type.represent, term.pointer, arg.ref
					), new LLVM.Name(
						cache.register, false, arg.ref
					), arg.ref, name
				));
			}

			frag.append(new LLVM.Call(
				new LLVM.Type(target.returnType[1].represent, target.returnType[0]),
				new LLVM.Name(target.represent, true, ast.tokens[0].ref),
				args,
				ast.ref.start
			));
		} else {
			let funcName = Flattern.VariableStr(ast.tokens[0]);
			this.ctx.getFile().throw(
				`Unable to find function "${funcName}" with signature ${signature.map(x => x[1].name)}`,
				ast.ref.start, ast.ref.end
			);
		}

		return frag;
	}

	compile(ast) {
		let fragment = new LLVM.Fragment();

		for (let token of ast.tokens) {
			switch (token.type) {
				case "declare":
					fragment.merge(this.compile_declare(token));
					break;
				case "assign":
					fragment.merge(this.compile_assign(token));
					break;
				case "return":
					fragment.merge(this.compile_return(token));
					break;
				case "call_procedure":
					fragment.merge(this.compile_call(token));
					break;
				default:
					this.ctx.getFile().throw(
						`Unexpected statment ${token.type}`,
						token.ref.start, token.ref.end
					);
			}
		}

		return fragment;
	}
}

module.exports = Scope;