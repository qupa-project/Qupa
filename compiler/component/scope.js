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
		this.returned  = false;
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

	register_Args(args) {
		this.generator.next(); // skip one id for function entry point

		let frag = new LLVM.Fragment();

		for (let arg of args) {
			if (this.variables[arg.name]) {
				this.ctx.getFile().throw(
					`Duplicate use of argument ${arg.name} function`,
					this.variables[arg.name].declared, ref
				);

				return null;
			}

			this.variables[arg.name] = new Register(
				this.generator.next(),
				arg.type,
				arg.name,
				arg.pointer+1,
				arg.ref
			);
			let cache = new Register(
				arg.id,
				arg.type,
				arg.name,
				arg.pointer,
				arg.ref
			);
			this.variables[arg.name].cache = cache;

			frag.append(new LLVM.Set(
				new LLVM.Name(
					this.variables[arg.name].id,
					false,
					arg.ref
				),
				new LLVM.Alloc(
					new LLVM.Type(arg.type.represent, arg.pointer, arg.ref),
					arg.type.size,
					arg.ref
				),
				arg.ref
			));
			frag.merge(this.variables[arg.name].flushCache(arg.ref, cache));
		}

		return frag;
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
	getVar(name) {
		let target = this.variables[name];
		if (!target) {
			return null;
		}

		if (target && !this.caching) {
			target.clearCache();
		}

		return target;
	}

	getVarNew(ast, read = true) {
		if (ast.type != "variable") {
			throw new TypeError(`Parsed AST must be a branch of type variable, not "${ast.type}"`);
		}

		let preamble = new LLVM.Fragment();
		let target = this.variables[ast.tokens[0].tokens];
		if (target) {
			if (ast.tokens.length > 1) {
				let load = target.get(ast.tokens.slice(1), this, read);
				if (load.error) {
					return load;
				}
				preamble.merge(load.preamble);
				target = load.register;
			}
		} else {
			target = null;
		}

		return {
			register: target,
			preamble: preamble
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
			let target = this.getVar(name);
			if (!target) {
				this.ctx.getFile().throw(
					`Undefined variable name ${Flattern.VariableStr(arg)}`,
					arg.ref.start, arg.ref.end
				);
				return null;
			}

			let cache = target.deref(this, true, 1);
			if (!cache.register) {
				this.ctx.getFile().throw(
					`Cannot dereference ${name}`,
					arg.ref.start, arg.ref.end
				);
				return null;
			}

			preamble.merge(cache.preamble);
			varArgs.push(cache.register);
		}
		let signature = varArgs.map(arg => [arg.pointer, arg.type]);

		let target = this.ctx.getFile().getFunction(ast.tokens[0], signature);
		if (target) {
			let irArgs = varArgs.map(arg => { return new LLVM.Argument(
				new LLVM.Type(arg.type.represent, arg.pointer),
				new LLVM.Name(arg.id, false),
				null, arg.name
			);});

			instruction = new LLVM.Call(
				new LLVM.Type(target.returnType[1].represent, target.returnType[0]),
				new LLVM.Name(target.represent, true, ast.tokens[0].ref),
				irArgs,
				ast.ref.start
			);

			// Clear any lower caches
			//   If this is a pointer the value may have changed
			for (let arg of varArgs) {
				let cache = arg.deref(this, false, 3);
				if (cache && cache.register) {
					cache.register.clearCache();
				}
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
		let load = this.getVarNew(ast.tokens[0], false);
		if (load.error) {
			this.ctx.getFile().throw(
				`Unable to access structure term "${load.ast.tokens}"`,
				load.ast.ref.start, load.ast.ref.end
			);
			return false;
		}
		let target = load.register;
		frag.merge(load.preamble);

		if (ast.tokens[1].type == "constant") {
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
		} else if (ast.tokens[1].type == "call") {
			let inner = this.compile_call(ast.tokens[1]);
			if (inner === null) {
				return null;
			}

			frag.merge(inner.preamble); // add any loads needed for call

			let cache = target.deref(this, false);
			if (!cache) {
				this.ctx.getFile().throw(
					`Unable to dereference variable "${name}"`,
					ast.tokens[0].ref.start, ast.tokens[0].ref.end
				);
				return false;
			}
			frag.merge(cache.preamble);

			frag.append(new LLVM.Set(new LLVM.Name(cache.register.id, false), inner.instruction));
			frag.merge(inner.epilog); // Mark any pointers that were parsed as updated
																	// due to potential side effects
			frag.merge(target.flushCache(
				ast.ref.start,
				this.caching ? cache.register : null // mark the cache generated here as already being the new cache
			));
		} else if (ast.tokens[1].type == "variable") {
			let otherName = Flattern.VariableStr(ast.tokens[1]);
			let other = this.getVar(otherName);
			if (!other) {
				this.ctx.getFile().throw(
					`Unable to find variable name "${otherName}"`,
					ast.tokens[1].ref.start, ast.tokens[1].ref.end
				);
				return false;
			}

			let cache = other.deref(this, true);
			if (!cache) {
				this.ctx.getFile().throw(
					`Unable to dereference variable "${otherName}"`,
					ast.tokens[1].ref.start, ast.tokens[1].ref.end
				);
				return false;
			}

			frag.merge(cache.preamble);

			frag.append(new LLVM.Store(
				new LLVM.Argument(
					new LLVM.Type(target.type.represent, target.pointer, target.declared),
					new LLVM.Name(`${target.id}`, false, ast.tokens[0].ref.start),
					ast.tokens[0].ref,
					name
				),
				new LLVM.Argument(
					new LLVM.Type(cache.register.type.represent, cache.register.pointer, cache.register.declared),
					new LLVM.Name(`${cache.register.id}`, false, ast.tokens[1].ref.start),
					ast.tokens[1].ref.start
				),
				target.type.size,
				ast.ref.start
			));

			target.markUpdated();
		} else {
			this.getFile().throw(
				`Unexpected assignment type "${ast.tokens[1].type}"`,
				ast.ref.start, ast.ref.end
			);
			return false;
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
					let target = this.getVar(name, true);
					if (!target) {
						this.ctx.getFile().throw(
							`Undefined variable name ${name}`,
							ast.tokens[0].ref.start, ast.tokens[0].ref.end
						);
						return null;
					}
					let cache = target.deref(this, true, 1);
					if (!cache) {
						this.ctx.getFile().throw(
							`Unable to dereference variable "${name}"`,
							ast.tokens[0].ref.start, ast.tokens[0].ref.end
						);
						return false;
					}
					frag.merge(cache.preamble);

					inner = new LLVM.Argument(
						new LLVM.Type( cache.register.type.represent, cache.register.pointer, cache.register.type.ref ),
						new LLVM.Name( cache.register.id, false, ast.tokens[0].ref )
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
		let target = this.getVar(name, true);
		if (!target) {
			this.getFile().throw(
				`Error: Unable to find variable name ${name}`,
				cond.ref.start, cond.ref.end
			);
			return frag;
		}
		let cache = target.deref(this, true, 1);
		if (!cache.register) {
			this.getFile().throw(
				`Error: Cannot dereference variable ${name}`,
				cond.ref.start, cond.ref.end
			);
			return frag;
		}
		frag.merge(cache.preamble);


		/**
		 * Prepare condition true body
		 */
		let label_true = new LLVM.Label(
			new LLVM.Name(`${this.generator.next()}`, false, ast.tokens[0].tokens[1]), ast.tokens[0].tokens[1]
		);
		let scope_true = this.clone();
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
		let scope_false = this.clone();
		if (hasElse) {
			body_false.prepend(label_false.toDefinition());
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
				new LLVM.Type(cache.register.type.represent, cache.register.pointer, cache.register.declared),
				new LLVM.Name(cache.register.id, false, ast.tokens[0].tokens[0].ref.start),
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

		// If any variables were updated within child scopes
		//   Flush their caches if needed
		this.mergeUpdates(scope_true, false);
		this.mergeUpdates(scope_false, false);

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

			if (inner instanceof LLVM.Fragment) {
				fragment.merge(inner);
			} else {
				break;
			}
		}

		return fragment;
	}


	/**
	 * Deep clone
	 * @returns {Scope}
	 */
	clone() {
		let out = new Scope(this.ctx, this.caching, this.generator);
		for (let name in this.variables) {
			out.variables[name] = this.variables[name].clone();
		}

		return out;
	}

	/**
	 * Updates any caches due to alterations in child scope
	 * @param {Scope} childScope the scope to be merged
	 * @param {Boolean} alwaysExecute If this scope will always execute and is non optional (i.e. not if statement)
	 */
	mergeUpdates(childScope, alwaysExecute = false) {
		for (let name in this.variables) {
			this.variables[name].mergeUpdates(childScope.variables[name], alwaysExecute);
		}
	}

}

module.exports = Scope;