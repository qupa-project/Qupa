const { Generator_ID } = require('./generate.js');
const LLVM = require("../middle/llvm.js");
const Flattern = require('../parser/flattern.js');
const Register = require('./register.js');

class Scope {
	static raisedVariables = true; // whether or not a variable can be redefined within a new scope

	constructor(ctx, caching = true, id_generator = new Generator_ID(1)) {
		this.ctx       = ctx;
		this.variables = {};
		this.generator = id_generator;
		this.caching   = caching;

		this.updated = [];
	}

	/**
	 * Return the function this scope is within
	 */
	getFunction() {
		if (this.ctx instanceof Scope) {
			return this.ctx.getFunction();
		}
	}

	/**
	 * Return the file of which this scope is within
	 */
	getFile () {
		return this.ctx.getFile();
	}

	/**
	 * Return the parent scope if this is a sub scope
	 */
	getParent() {
		if (this.ctx instanceof Scope) {
			return this.ctx;
		}
		return null;
	}

	notifyUpdated(name) {
		if (this.updated.indexOf(name) == -1) {
			this.updated.push(name);
		}
	}

	/**
	 * Define a new variable
	 * @param {TypeDef} type 
	 * @param {Number} pointerLvl 
	 * @param {String} name 
	 * @param {BNF_Reference} ref 
	 */
	register_Var(type, pointerLvl, name, ref) {
		if (Scope.raisedVariables) {
			if (this.getParent()) {
				return this.ctx.register_Var(type, pointerLvl, name, ref);
			}
		}

		if (this.variables[name]) {
			this.ctx.getFile().throw(
				`Duplicate declaration of name ${name} in scope`,
				this.variables[name].declared, ref
			);
		}

		this.variables[name] = new Register(this.generator.next(), type, name, pointerLvl, ref);
		return this.variables[name];
	}

	/**
	 * Get the register holding the variable or it's dereferenced state
	 * @param {BNF_SyntaxNode} name "type" = variable
	 * @param {Number|Null} pointerLvl -X means dereference at least X times, +X means to that reference depth, null depth ignorant
	 * @param {*} read Will data be read or just written?
	 */
	getVar(name, pointerLvl = null, read = true) {
		if (Scope.raisedVariables) {
			if (this.getParent()) {
				let res = this.ctx.getVar(name, pointerLvl, read);
				return res;
			}
		}

		let mode = "exact";
		if (pointerLvl < 0) {
			mode = "down";
			pointerLvl = -pointerLvl;
		} else if (pointerLvl === null) {
			mode = "ignorant";
		}

		let preamble = new LLVM.Fragment();
		let target = this.variables[name];

		if (target && !this.caching) {
			target.clearCache();
		}

		while ( target != null && (
			( mode == "exact" && target.pointer > pointerLvl ) ||
			( mode == "down" && pointerLvl > 0 )
		)) {
			if (!target.cache ||
				// No not reuse a register with a write action
				(!read && (
					(mode == "exact" && target.pointer+1 == pointerLvl) ||
					(mode == "down" && pointerLvl == 1)
				))
			) {
				let id = this.generator.next();
				target.cache = new Register(id, target.type, `#t${id}`, target.pointer-1);
				if (read) {
					let inst = new LLVM.Load(
						new LLVM.Name(`${target.cache.id}`, false),
						new LLVM.Type(target.type.represent, target.pointer-1),
						new LLVM.Name(`${target.id}`, false),
						target.type.size
					);
					preamble.append(inst);
				}
			}

			target = target.cache;
			if (mode == "down") {
				pointerLvl--;
			}
		}

		// Mark all variables altered in this scope
		// So upper scopes can be notified
		if (!read) {
			let parent = this.getParent();
			if (parent) {
				parent.notifyUpdated(name);
			}
		};

		return {
			preamble,
			register: target
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

	compile_call(ast) {
		let instruction = null;
		let preamble    = new LLVM.Fragment();
		let epilog      = new LLVM.Fragment();

		let varArgs = [];
		for (let arg of ast.tokens[1].tokens) {
			let name = Flattern.VariableStr(arg);
			let target = this.getVar(name, 0);
			if (!target.register) {
				this.ctx.getFile().throw(
					`Undefined variable name ${name}`,
					arg.ref.start, arg.ref.end
				);
				return null;
			}

			preamble.merge(target.preamble);
			varArgs.push(target.register);
		}
		let signature = varArgs.map(arg => [arg.pointer, arg.type]);

		let target = this.ctx.getFile().getFunction(ast.tokens[0], signature);
		if (target) {
			let irArgs = varArgs.map(arg => { return new LLVM.Argument(
				new LLVM.Type(arg.type.represent, arg.pointer),
				new LLVM.Name(arg.id, false),
				null, arg.name
			)});

			instruction = new LLVM.Call(
				new LLVM.Type(target.returnType[1].represent, target.returnType[0]),
				new LLVM.Name(target.represent, true, ast.tokens[0].ref),
				irArgs,
				ast.ref.start
			);

			// Clear any lower caches
			//   If this is a pointer the value may have changed
			for (let arg of varArgs) {
				arg.clearCache();
			}
		} else {
			let funcName = Flattern.VariableStr(ast.tokens[0]);
			this.ctx.getFile().throw(
				`Unable to find function "${funcName}" with signature ${signature.map(x => x[1].name).join(',')}`,
				ast.ref.start, ast.ref.end
			);
			return null;
		}

		return { preamble, instruction, epilog };
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

		let ptrLvl = typeRef[0]  ? 2 : 1;
		let reg = this.register_Var(
			typeRef[1],
			ptrLvl,
			name,
			ast.ref.start
		);

		frag.append(new LLVM.Set(
			new LLVM.Name(reg.id, false, ast.tokens[1].ref.start),
			new LLVM.Alloc(
				new LLVM.Type(reg.type.represent, ptrLvl-1, ast.tokens[0].ref.start),
				reg.type.size,
				ast.ref.start
			),
			ast.ref.start
		));

		return frag;
	}
	compile_assign(ast){
		let frag = new LLVM.Fragment();

		// Get the variable at the right pointer depth
		let name = Flattern.VariableStr(ast.tokens[0]);
		let load = this.getVar(name, null);
		frag.merge(load.preamble);

		let target = load.register;
		if (!target) {
			this.ctx.getFile().throw(
				`Undefined variable "${name}"`,
				ast.ref.start, ast.ref.end
			);
			return false;
		}

		switch (ast.tokens[1].type) {
			case "constant":
				let cnst = this.compile_constant(ast.tokens[1]);
				frag.append(new LLVM.Store(
					new LLVM.Argument(
						new LLVM.Type(target.type.represent, target.pointer),
						new LLVM.Name(`${target.id}`, false),
						ast.tokens[0].ref,
						name
					),
					cnst,
					target.type.size,
					ast.ref.start
				));
				target.markUpdated(); // Mark that this value was directly changed
				                          //  and caches need to be dropped
				break;
			case "call":
				let inner = this.compile_call(ast.tokens[1]);
				if (inner === null) {
					return null;
				}

				frag.merge(inner.preamble); // add any loads needed for call

				load = this.getVar(name, -1, false); // since name as an address is known, the resolved cache will be known
				frag.merge(load.preamble);
				let cache = load.register;

				frag.append(new LLVM.Set(new LLVM.Name(cache.id, false), inner.instruction));
				frag.merge(inner.epilog); // Mark any pointers that were parsed as updated
																	// due to potential side effects
				frag.merge(target.flushCache(
					ast.ref.start,
					this.caching ? cache : null // mark the cache generated here as already being the new cache
				));
				break;
			case "variable":
				let otherName = Flattern.VariableStr(ast.tokens[1]);
				load = this.getVar(otherName, -1, true);
				frag.merge(load.preamble);

				frag.append(new LLVM.Store(
					new LLVM.Argument(
						new LLVM.Type(target.type.represent, target.pointer, target.declared),
						new LLVM.Name(`${target.id}`, false, ast.tokens[0].ref.start),
						ast.tokens[0].ref,
						name
					),
					new LLVM.Argument(
						new LLVM.Type(load.register.type.represent, load.register.pointer, load.register.declared),
						new LLVM.Name(`${load.register.id}`, false, ast.tokens[1].ref.start),
						ast.tokens[1].ref.start
					),
					target.type.size,
					ast.ref.start
				));

				target.markUpdated();
				break;
			default:
				this.getFile().throw(
					`Unexpected assignment type "${ast.tokens[1].type}"`,
					ast.ref.start, ast.ref.end
				);
		}

		return frag;
	}
	compile_return(ast){
		let frag = new LLVM.Fragment();
		let inner = null;

		if (ast.tokens.length == 0){
			inner = new LLVM.Type("void", false);
		} else {
			switch (ast.tokens[0].type) {
				case "constant":
					inner = this.compile_constant(ast.tokens[0]);
					break;
				case "variable":
					inner = new LLVM.Fragment();
					let name = Flattern.VariableStr(ast.tokens[0]);
					let target = this.getVar(name, -1, true);
					let term = target.register;
					if (!term) {
						this.ctx.getFile().throw(
							`Undefined variable name ${name}`,
							ast.tokens[0].ref.start, ast.tokens[0].ref.end
						);
						return null;
					}

					frag.merge(target.preamble);
					inner = new LLVM.Argument(
						new LLVM.Type( term.type.represent, term.pointer, term.type.ref ),
						new LLVM.Name( term.id, false, ast.tokens[0].ref )
					);
					break;
				default:
					this.ctx.getFile().throw(
						`Unexpected return expression type "${ast.tokens[0].type}"`,
						ast.ref.start, ast.ref.end
					);
			}
		}

		frag.append(new LLVM.Return(inner, ast.ref.start));

		return frag;
	}

	compile_call_procedure(ast) {
		let frag = new LLVM.Fragment(ast);
		let out = this.compile_call(ast);
		if (out === null) {
			return null;
		}

		// Merge the preable, execution, and epilog into one fragment
		frag.merge(out.preamble);
		frag.append(out.instruction);
		frag.merge(out.epilog);
		return frag;
	}


	compile_if (ast) {
		let frag = new LLVM.Fragment(ast);

		// Check for elif clause
		if (ast.tokens[1].length > 0) {
			file.throw(
				`Elif statements are currently unsupported`,
				ast.ref.start, ast.ref.end
			);
			return frag;
		}

		/**
		 * Prepare the condition value
		 */
		let cond = ast.tokens[0].tokens[0];
		if (cond.type != "variable") {
			this.getFile().throw(
				`Error: If statements may only take variables`,
				cond.ref.start, cond.ref.end
			);
			return frag;
		}
		let name = Flattern.VariableStr(cond);
		let load = this.getVar(name, 0, true);
		frag.merge(load.preamble);
		let cond_target = load.register;


		/**
		 * Prepare condition true body
		 */
		let label_true = new LLVM.Label(
			new LLVM.Name(`${this.generator.next()}`, false, ast.tokens[0].tokens[1]), ast.tokens[0].tokens[1]
		);
		let scope_true = new Scope(this, this.caching, this.generator);
		let body_true = scope_true.compile(ast.tokens[0].tokens[1]);
		body_true.prepend(label_true.toDefinition());


		/**
		 * Prepare condition false body
		 */
		let hasElse = ast.tokens[2] !== null;
		let label_false = new LLVM.Label(
			new LLVM.Name(`${this.generator.next()}`, false)
		);
		let body_false = new LLVM.Fragment();
		if (hasElse) {
			body_false.prepend(label_false.toDefinition());
			let scope_false = new Scope(this, this.caching, this.generator);
			body_false = scope_false.compile(ast.tokens[2].tokens[0]);
			body_false.prepend(label_false.toDefinition());
		}


		/**
		 * Cleanup and merging
		 */
		let endpoint = hasElse ? new LLVM.Label(
			new LLVM.Name(`${this.generator.next()}`, false)
		) : label_false;

		frag.append(new LLVM.Branch(
			new LLVM.Argument(
				new LLVM.Type(cond_target.type.represent, cond_target.pointer, cond_target.declared),
				new LLVM.Name(cond_target.id, false, ast.tokens[0].tokens[0].ref.start),
				ast.tokens[0].tokens[0].ref.start
			),
			label_true,
			label_false,
			ast.ref.start
		));

		// Push the if branch
		body_true.append(new LLVM.Branch_Unco(endpoint));
		frag.merge(body_true);

		// Push the else branch
		if (hasElse) {
			body_false.append(new LLVM.Branch_Unco(endpoint));
			frag.merge(body_false);
		}

		// Push the end point
		frag.append(endpoint.toDefinition());

		return frag;
	}





	compile(ast) {
		let fragment = new LLVM.Fragment();

		let inner = null;
		for (let token of ast.tokens) {
			switch (token.type) {
				case "declare":
					inner = this.compile_declare(token);
					break;
				case "assign":
					inner = this.compile_assign(token);
					break;
				case "return":
					inner = this.compile_return(token);
					break;
				case "call_procedure":
					inner = this.compile_call_procedure(token);
					break;
				case "if":
					inner = this.compile_if(token);
					break;
				default:
					this.ctx.getFile().throw(
						`Unexpected statment ${token.type}`,
						token.ref.start, token.ref.end
					);
			}

			if (inner !== null) {
				fragment.merge(inner);
			}

			// Propergate any updates from lower scopes
			let parent = this.getParent();
			for (let val in this.updated) {
				this.getVar(val).markUpdated();

				if (parent) {
					parent.notifyUpdated(val);
				}
			}
			this.updated = [];
		}

		return fragment;
	}
}

module.exports = Scope;