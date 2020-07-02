const { Generator_ID } = require('./generate.js');
const LLVM = require("../middle/llvm");
const Flattern = require('../parser/flattern.js');

class Scope {
	constructor(ctx, id_generator = new Generator_ID()) {
		this.ctx       = ctx;
		this.variables = {};
		this.registers = {};
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

		frag.append(new LLVM.Alloc(
			new LLVM.Name(this.variables[name].register, false, ast.tokens[1].ref.start),
			new LLVM.Type(this.variables[name].type.represent, false, ast.tokens[0].ref.start),
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
				let type = "i32";
				let val = ast.tokens[1].tokens[0].tokens;
				if (ast.tokens[1].tokens[0].type == "float") {
					type = "double";
				} else if (ast.tokens[1].tokens[0].type == "boolean") {
					type = "i1";
					val = val == "true" ? 1 : 0;
				}
				frag.append(new LLVM.Store(
					new LLVM.Type(target.type.represent, false),
					new LLVM.Name(target.register, false),
					new LLVM.Type(type, false),
					val,
					target.type.size,
					ast.ref.start
				));
				if (this.registers[name]) {
					this.registers[name].modified = true;
				}
				break;
			case "call":
				frag.append(new LLVM.Comment(`TODO var = call()`));
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
		frag.append(new LLVM.Comment(`TODO Return`));
		return frag;
	}
	compile_call(ast) {
		let frag = new LLVM.Fragment();
		frag.append(new LLVM.Comment(`TODO Call`));
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