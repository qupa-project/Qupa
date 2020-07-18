const Flattern = require('../parser/flattern.js');
const LLVM = require("../middle/llvm.js");
const Scope = require('./scope.js');
const State = require('./state.js');

const Primative = require('./../primative/main.js');

class Execution {
	/**
	 * 
	 * @param {Function|Execution} ctx 
	 * @param {*} returnType 
	 * @param {*} scope 
	 */
	constructor(ctx, returnType, scope) {
		this.ctx        = ctx;
		this.scope      = scope;
		this.returnType = returnType;
		this.returned   = false;
		this.isChild    = false;
	}

	/**
	 * Return the function this scope is within
	 */
	getFunction() {
		return this.ctx.getFunction();
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
		if (this.ctx instanceof Execution) {
			return this.ctx;
		}
		return null;
	}



	/**
	 * Generates the LLVM for a constant
	 * Used in other compile functions
	 * @param {BNF_Node} ast 
	 */
	compile_constant(ast) {
		let type = "i32";
		let val = ast.tokens[0].tokens;
		if (ast.tokens[0].type == "float") {
			type = "float";
		} else if (ast.tokens[0].type == "boolean") {
			type = "i1";
			val = val == "true" ? 1 : 0;
		}

		return new LLVM.Constant(
			new LLVM.Type(type, 0, ast.ref.start),
			val,
			ast.ref.start
		);
	}

	/**
	 * Generates the LLVM for a call
	 * Used in other compile functions
	 * @param {BNF_Node} ast 
	 */
	compile_call(ast) {
		let instruction = null;
		let preamble    = new LLVM.Fragment();
		let epilog      = new LLVM.Fragment();
		let returnType    = null;



		// Get argument types
		//  and generate LLVM for argument inputs
		//  also add any preamble to get the arguments
		let signature = [];
		let args = [];
		let regs = [];
		for (let arg of ast.tokens[1].tokens) {
			if (arg.type == "variable") {
				let load = this.scope.getVar(arg, true);
				if (load.error) {
					this.getFile().throw(load.msg, load.ref.start, load.ref.end);
					return false;
				}
				preamble.merge(load.preamble);

				let cache = load.register.deref(this.scope, true, 1);
				if (!cache.register) {
					let name = Flattern.VariableStr(arg);
					this.getFile().throw(
						`Cannot dereference ${name}`,
						arg.ref.start, arg.ref.end
					);
					return false;
				}
				preamble.merge(cache.preamble);

				args.push(new LLVM.Argument(
					new LLVM.Type(cache.register.type.represent, cache.register.pointer),
					new LLVM.Name(cache.register.id, false),
					null,
					arg.name
				));
				regs.push(cache.register);
				signature.push([ cache.register.pointer, cache.register.type ]);
			} else if (arg.type == "constant") {
				let cnst = this.compile_constant(arg);
				args.push(cnst);
				signature.push([0, Primative.types[cnst.type.term]]);
			} else {
				this.getFile().throw(
					`Cannot take ${arg.type} as call argument`,
					arg.ref.start, arg.ref.end
				);
				return false;
			}
		}



		// Link any [] accessors
		let accesses = [];
		let file = this.getFile();
		for (let access of ast.tokens[0].tokens.slice(1)) {
			if (access[0] == "[]") {
				let out = [];
				for (let inner of access[1].tokens) {
					let target = this.scope.getVar(inner, true);
					if (target.error !== true) {
						file.throw(
							`Error: Cannot processed variables withiin [] for function access`,
							inner.ref.start, inner.ref.end
						);
						return false;
					}

					let forward = Flattern.VariableList(inner);
					if (forward[0] != 0) {
						file.throw(
							`Error: Cannot dereference ${Flattern.VariableStr(inner)}`,
							inner.ref.start, inner.ref.end
						);
						return false;
					}

					target = file.getType(forward.slice(1));

					if (!target) {
						file.throw(
							`Error: Unknown variable ${Flattern.VariableStr(inner)}`,
							inner.ref.start, inner.ref.end
						);
						return false;
					}
					out.push(target);
				}

				accesses.push(out);
			} else {
				accesses.push(access);
			}
		}


		// Generate the LLVM for the call
		//   Mark any parsed pointers as now being concurrent
		let target = file.getFunction(accesses, signature);
		if (!target) {
			let funcName = Flattern.VariableStr(ast.tokens[0]);
			file.throw(
				`Unable to find function "${funcName}" with signature ${Flattern.SignatureArr(signature)}`,
				ast.ref.start, ast.ref.end
			);
			return false;
		}

		if (target.isInline) {
			let inner = target.generate(regs, args);
			preamble.merge(inner.preamble);

			instruction = inner.instruction;
			returnType = inner.returnType;
		} else {
			instruction = new LLVM.Call(
				new LLVM.Type(target.returnType[1].represent, target.returnType[0]),
				new LLVM.Name(target.represent, true, ast.tokens[0].ref),
				args,
				ast.ref.start
			);
			returnType = target.returnType;
	
			// Clear any lower caches
			//   If this is a pointer the value may have changed
			for (let arg of regs) {
				arg.concurrent = true;
				arg.clearCache();
			}

			// Mark this function as being called for the callgraph
			this.getFunction().addCall(target);
		}

		return { preamble, instruction, epilog, returnType };
	}

	/**
	 * Generates the LLVM for a call where the result is ignored
	 * @param {BNF_Reference} ast 
	 */
	compile_call_procedure(ast) {
		let frag = new LLVM.Fragment(ast);
		let out = this.compile_call(ast);
		if (out === false) {
			return false;
		}

		// Merge the preable, execution, and epilog into one fragment
		frag.merge(out.preamble);
		frag.append(out.instruction);
		frag.merge(out.epilog);
		return frag;
	}



	compile_declare(ast){
		let typeRef = this.getFunction().getTypeFrom_DataType(ast.tokens[0]);
		let	name = ast.tokens[1].tokens;
		let frag = new LLVM.Fragment();

		if (typeRef == null) {
			let typeName = Flattern.DataTypeStr(ast.tokens[0]);
			this.getFile().throw(`Error: Invalid type name "${typeName}"`, ast.ref.start, ast.ref.end);
			return false;
		}

		let ptrLvl = typeRef[0];
		let reg = this.scope.register_Var(
			typeRef[1],
			ptrLvl+1,
			name,
			ast.ref.start
		);

		frag.append(new LLVM.Set(
			new LLVM.Name(reg.id, false, ast.tokens[1].ref.start),
			new LLVM.Alloc(
				new LLVM.Type(reg.type.represent, ptrLvl, ast.tokens[0].ref.start),
				reg.type.size,
				ast.ref.start
			),
			ast.ref.start
		));

		return frag;
	}
	compile_assign(ast){
		let frag = new LLVM.Fragment();

		let usingStore = false;
		switch (ast.tokens[1].type){
			case "constant":
				usingStore = true;
		}

		// Get the variable at the right pointer depth
		let load = this.scope.getVar(ast.tokens[0], usingStore);
		if (load.error) {
			this.getFile().throw( load.msg, load.ref.start, load.ref.end );
			return false;
		}
		let target = load.register;
		frag.merge(load.preamble);

		if (ast.tokens[1].type == "constant") {
			let cnst = this.compile_constant(ast.tokens[1]);
			if (cnst.type.term != target.type.represent) {
				this.getFile().throw(
					`Error: Assignment type miss-match, expected ${target.type.name} but got ${cnst.type.term}`,
					ast.ref.start, ast.ref.end
				);
				return false;
			}

			frag.append(new LLVM.Store(
				new LLVM.Argument(
					new LLVM.Type(target.type.represent, target.pointer),
					new LLVM.Name(`${target.id}`, false),
					ast.tokens[0].ref,
					Flattern.VariableStr(ast.tokens[0])
				),
				cnst,
				target.type.size,
				ast.ref.start
			));
			target.markUpdated(); // Mark that this value was directly changed
			                      //  and caches need to be dropped
		} else if (ast.tokens[1].type == "call") {
			let inner = this.compile_call(ast.tokens[1]);
			if (inner === false) {
				return false;
			}

			if (inner.returnType != target.type) {
				this.getFile().throw(
					`Error: Type miss-match, this functiion does not return ${target.type.name}, instead returns ${inner.returnType.name}`,
					ast.tokens[1].ref.start, ast.tokens[1].ref.end
				);
				return false;
			}
			frag.merge(inner.preamble); // add any loads needed for call


			let cache = target.deref(this.scope, false);
			if (!cache) {
				this.getFile().throw(
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
			let load = this.scope.getVar(ast.tokens[1], true);
			if (load.error) {
				this.getFile().throw(
					`Error: Unable to access structure term "${load.ast.tokens}"`,
					load.ast.ref.start, load.ast.ref.end
				);
				return false;
			}
			frag.merge(load.preamble);

			if (load.register.type != target.type) {
				this.getFile().throw(
					`Error: Type miss-match, expected ${target.type.name} but got ${load.register.type.name}`,
					ast.ref.start, ast.ref.end
				);
				return false;
			}

			let cache = load.register.deref(this.scope, true);
			if (!cache) {
				this.getFile().throw(
					`Unable to dereference variable "${otherName}"`,
					ast.tokens[1].ref.start, ast.tokens[1].ref.end
				);
				return false;
			}
			// Cache replacement due to constant value caches
			//   and now shared value
			frag.merge(cache.preamble);
			target.cache = load.register.cache;

			frag.append(new LLVM.Store(
				new LLVM.Argument(
					new LLVM.Type(target.type.represent, target.pointer, target.declared),
					new LLVM.Name(`${target.id}`, false, ast.tokens[0].ref.start),
					ast.tokens[0].ref,
					Flattern.VariableStr(ast.tokens[0])
				),
				new LLVM.Argument(
					new LLVM.Type(cache.register.type.represent, cache.register.pointer, cache.register.declared),
					new LLVM.Name(`${cache.register.id}`, false, ast.tokens[1].ref.start),
					ast.tokens[1].ref.start
				),
				target.type.size,
				ast.ref.start
			));
		} else {
			this.getFile().throw(
				`Unexpected assignment type "${ast.tokens[1].type}"`,
				ast.ref.start, ast.ref.end
			);
			return false;
		}

		return frag;
	}
	compile_declare_assign(ast) {
		let frag = new LLVM.Fragment();

		let declare = this.compile_declare(ast);
		if (declare == false) {
			return false;
		}
		frag.merge(declare);

		let forward = {
			type: "assign",
			tokens: [
				{
					type: "variable",
					tokens: ["", ast.tokens[1]],
					ref: ast.tokens[1].ref
				},
				ast.tokens[2]
			],
			ref: {
				start: ast.tokens[1].ref.start,
				end: ast.ref.end
			}
		};
		let assign = this.compile_assign(forward);
		if (assign === false) {
			return false;
		}
		frag.merge(assign);

		return frag;
	}



	compile_return(ast){
		let frag = new LLVM.Fragment();
		let inner = null;

		this.returned = true;
		let returnType = null;
		if (ast.tokens.length == 0){
			inner = new LLVM.Type("void", false);
			returnType = "void";
		} else {
			switch (ast.tokens[0].type) {
				case "constant":
					inner = this.compile_constant(ast.tokens[0]);
					returnType = inner.type.term;
					break;
				case "call":
					let call = this.compile_call(ast.tokens[0]);
					frag.merge(call.preamble);
					if (call.epilog.stmts.length > 0){
						throw new Error("Unhandled edge case, returning a funciton call without handeling epilog");
					}

					let regID = this.scope.genID();
					let regName = new LLVM.Name(regID.toString(), false, ast.tokens[0].ref);
					returnType = call.instruction.rtrnType.term;
					frag.append(new LLVM.Set(
						regName,
						call.instruction,
						ast.ref
					));
					inner = new LLVM.Argument(
						new LLVM.Type(call.instruction.rtrnType.term, 0),
						regName,
						ast.ref
					);
					frag.merge(call.epilog);
					break;
				case "variable":
					inner = new LLVM.Fragment();
					let name = Flattern.VariableStr(ast.tokens[0]);
					let load = this.scope.getVar(ast.tokens[0], true);
					if (load.error) {
						this.getFile().throw(
							`Unable to access structure term "${load.ast.tokens}"`,
							load.ast.ref.start, load.ast.ref.end
						);
						return false;
					}
					frag.merge(load.preamble);

					let cache = load.register.deref(this.scope, true, 1);
					if (!cache) {
						this.getFile().throw(
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
					returnType = cache.register.type.represent;
					break;
				default:
					this.getFile().throw(
						`Unexpected return expression type "${ast.tokens[0].type}"`,
						ast.ref.start, ast.ref.end
					);
			}
		}

		if (this.returnType.represent != returnType) {
			this.getFile().throw(
				`Return type miss-match, expected ${this.returnType.name}`,
				ast.ref.start, ast.ref.end
			);
		}

		// Ensure that pointers actually write their data before returning
		for (let name in this.variables) {
			if (this.variables[name].concurrent) {
				frag.merge(this.variables[name].flushCache());
			}
		}
		frag.append(new LLVM.Return(inner, ast.ref.start));
		return frag;
	}



	compile_if (ast) {
		let frag = new LLVM.Fragment(ast);

		// Check for elif clause
		if (ast.tokens[1].length > 0) {
			this.getFile().throw(
				`Error: Elif statements are currently unsupported`,
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
			return false;
		}
		let load = this.scope.getVar(cond, true);
		if (load.error) {
			this.getFile().throw(
				`Unable to access structure term "${load.ast.tokens}"`,
				load.ast.ref.start, load.ast.ref.end
			);
			return false;
		}
		frag.merge(load.preamble);

		let cache = load.register.deref(this.scope, true, 1);
		if (!cache.register) {
			let name = Flattern.VariableStr(cond);
			this.getFile().throw(
				`Error: Cannot dereference variable ${name}`,
				cond.ref.start, cond.ref.end
			);
			return false;
		}
		frag.merge(cache.preamble);


		/**
		 * Prepare condition true body
		 */
		let label_true = new LLVM.Label(
			new LLVM.Name(`${this.scope.genID()}`, false, ast.tokens[0].tokens[1]), ast.tokens[0].tokens[1]
		);
		let scope_true = this.clone();
		let body_true = scope_true.compile(ast.tokens[0].tokens[1]);
		body_true.prepend(label_true.toDefinition());


		/**
		 * Prepare condition false body
		 */
		let hasElse = ast.tokens[2] !== null;
		let label_false = new LLVM.Label(
			new LLVM.Name(`${this.scope.genID()}`, false)
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
			new LLVM.Name(`${this.scope.genID()}`, false)
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
		if (!scope_true.returned) {
			body_true.append(new LLVM.Branch_Unco(endpoint));
		}
		frag.merge(body_true);

		// Push the else branch
		if (hasElse) {
			if (!scope_false.returned) {
				body_false.append(new LLVM.Branch_Unco(endpoint));
			}
			frag.merge(body_false);
		}

		// Both branches returned
		if (scope_true.returned && scope_false.returned) {
			this.returned = true;
		}

		// Push the end point
		if (!this.returned) {
			frag.append(endpoint.toDefinition());
		}

		// If any variables were updated within child scopes
		//   Flush their caches if needed
		this.mergeUpdates(scope_true, false);
		this.mergeUpdates(scope_false, false);

		return frag;
	}


	compile_while (ast) {
		let frag = new LLVM.Fragment();

		let scope_check = this.clone();
		scope_check.clearAllCaches();
		let label_check = new LLVM.Label(
			new LLVM.Name(`${this.scope.genID()}`, false, ast.tokens[0].ref),
			ast.tokens[0].tokens[0]
		);
		let check = scope_check.compile_while_condition(ast.tokens[0]);
		if (check === false) {
			return false;
		}

		let scope_loop = this.clone();
		scope_loop.clearAllCaches();
		let label_loop = new LLVM.Label(
			new LLVM.Name(`${this.scope.genID()}`, false, ast.tokens[0].tokens[0]),
			ast.tokens[0].tokens[0]
		);
		let loop = scope_loop.compile(ast.tokens[1]);
		if (loop === false) {
			return false;
		}
		
		let label_end = new LLVM.Label(
			new LLVM.Name(`${this.scope.genID()}`, false, ast.tokens[0].tokens[0]),
			ast.tokens[0].tokens[0]
		);
		
		
		frag.append(new LLVM.Branch_Unco(label_check));
		frag.append(label_check.toDefinition());
		frag.merge(check.instructions);
		frag.append(new LLVM.Branch(
			check.register,
			label_loop,
			label_end,
			ast.ref.start
		));
		frag.append(label_loop.toDefinition());
		frag.merge(loop);
		frag.append(new LLVM.Branch_Unco(label_check));
		frag.append(label_end.toDefinition());


		// If any variables were updated within child scopes
		//   Flush their caches if needed
		this.mergeUpdates(scope_check, true);
		this.mergeUpdates(scope_loop, true);

		return frag;
	}
	compile_while_condition(ast) {
		let frag = new LLVM.Fragment();

		if (ast.type != "variable") {
			this.getFile().throw(
				`Error: If statements may only take variables`,
				cond.ref.start, cond.ref.end
			);
			return false;
		}
		let load = this.scope.getVar(ast, true);
		if (load.error) {
			this.getFile().throw(
				`Unable to access structure term "${load.ast.tokens}"`,
				load.ast.ref.start, load.ast.ref.end
			);
			return false;
		}
		frag.merge(load.preamble);

		let cache = load.register.deref(this.scope, true, 1);
		if (!cache.register) {
			let name = Flattern.VariableStr(ast);
			this.getFile().throw(
				`Error: Cannot dereference variable ${name}`,
				cond.ref.start, cond.ref.end
			);
			return false;
		}
		frag.merge(cache.preamble);


		return {
			instructions: frag,
			register: new LLVM.Argument(
				new LLVM.Type(cache.register.type.represent, cache.register.pointer, cache.register.declared),
				new LLVM.Name(cache.register.id, false, ast.ref.start),
				ast.ref.start
			)
		};
	}



	compile(ast) {
		let fragment = new LLVM.Fragment();

		let returnWarned = false;
		let failed = false;
		let inner = null;
		for (let token of ast.tokens) {
			if (this.returned && !returnWarned) {
				this.getFile().throw(
					`Warn: This function has already returned, this line and preceeding lines will not execute`,
					token.ref.start, token.ref.end
				);
				returnWarned = true;
				break;
			}

			switch (token.type) {
				case "declare":
					inner = this.compile_declare(token);
					break;
				case "assign":
					inner = this.compile_assign(token);
					break;
				case "declare_assign":
					inner = this.compile_declare_assign(token);
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
				case "while":
					inner = this.compile_while(token);
					break;
				default:
					this.getFile().throw(
						`Unexpected statment ${token.type}`,
						token.ref.start, token.ref.end
					);
			}

			if (inner instanceof LLVM.Fragment) {
				fragment.merge(inner);
			} else {
				failed = true;
				break;
			}
		}

		if (!failed && this.returned == false && !this.isChild) {
			this.getFile().throw(
				`Function does not return`,
				ast.ref.start, ast.ref.end
			);
		}

		return fragment;
	}



	/**
	 * Deep clone
	 * @returns {Scope}
	 */
	clone() {
		let scope = this.scope.clone();
		let out = new Execution(this, this.returnType, scope);
		out.isChild = true;
		return out;
	}

	/**
	 * Clears the cache of every 
	 */
	clearAllCaches() {
		this.scope.clearAllCaches();
	}

	/**
	 * Updates any caches due to alterations in child scope
	 * @param {Execution} child the scope to be merged
	 * @param {Boolean} alwaysExecute If this scope will always execute and is non optional (i.e. not if statement)
	 */
	mergeUpdates(child, alwaysExecute = false) {
		this.scope.mergeUpdates(child.scope, alwaysExecute);
		if (alwaysExecute && child.returned) {
			this.returned = true;
		}
	}
}

module.exports = Execution;