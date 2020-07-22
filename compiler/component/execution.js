const Flattern = require('../parser/flattern.js');
const LLVM = require("../middle/llvm.js");
const TypeRef = require('./typeRef.js');
const Scope = require('./scope.js');
const State = require('./state.js');
const { Argument, Type } = require('../middle/llvm.js');
const Register = require('./register.js');

const Primative = {
	types: require('./../primative/types.js')
};

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
	 * @returns {Function_Instance}
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
	 *
	 * @param {BNF_Node} node
	 */
	resolveTemplate(node) {
		let template = [];
		for (let arg of node.tokens) {
			switch (arg.type) {
				case "data_type":
					let type = this.getFunction().getType(arg, this.resolveTemplate(arg.tokens[3]));
					if (type === null) {
						this.getFile().throw(
							`Error: Unknown data type ${Flattern.DataTypeStr(arg)}`,
							arg.ref.start, arg.ref.end
						);
						return false;
					}

					template.push(type);
					break;
				default:
					this.getFile().throw(
						`Error: ${arg.type} are currently unsupported in template arguments`,
						arg.ref.start, arg.ref.end
					);
					return false;
			}
		}

		return template;
	}



	/**
	 * Generates the LLVM for a constant
	 * Used in other compile functions
	 * @param {BNF_Node} ast
	 */
	compile_constant(ast) {
		let type = Primative.types.i32;
		let val = ast.tokens[0].tokens;
		if (ast.tokens[0].type == "float") {
			type = Primative.types.float;
		} else if (ast.tokens[0].type == "boolean") {
			type = Primative.types.bool;
			val = val == "true" ? 1 : 0;
		}

		return {
			instruction: new LLVM.Argument(
				new LLVM.Type(type.represent, 0, ast.ref.start),
				new LLVM.Constant(val, ast.ref.start)
			),
			preamble: new LLVM.Fragment(),
			epilog: new LLVM.Fragment(),
			type: new TypeRef(0, type),
		};
	}

	/**
	 * Load a variable
	 * @param {BNF_Node} ast
	 */
	compile_loadVariable(ast) {
		let load = this.scope.getVar(ast, true);
		if (load.error) {
			this.getFile().throw(load.msg, load.ref.start, load.ref.end);
			return false;
		}


		let count = ast.tokens[0]+1;
		let cache = load.register.deref(this.scope, true, count);
		if (!cache.register) {
			let name = Flattern.VariableStr(ast);
			this.getFile().throw(
				`Error: Cannot dereference ${Flattern.DuplicateChar(count, "$")}${name}`,
				ast.ref.start, ast.ref.end
			);
			return false;
		}
		load.preamble.merge(cache.preamble);

		return {
			instruction: new LLVM.Argument(
				new LLVM.Type(cache.register.type.represent, cache.register.pointer),
				new LLVM.Name(cache.register.id, false),
				null,
				load.register.name
			),
			preamble: load.preamble,
			epilog: new LLVM.Fragment(),
			type: new TypeRef(cache.register.pointer, cache.register.type)
		};
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
		for (let arg of ast.tokens[2].tokens) {
			if (arg.type == "variable") {
				let load = this.scope.getVar(arg, true);
				if (load.error) {
					this.getFile().throw(load.msg, load.ref.start, load.ref.end);
					return false;
				}
				preamble.merge(load.preamble);

				let cache = load.register.deref(this.scope, true, 1);
				if (!cache || !cache.register) {
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
				signature.push(new TypeRef(cache.register.pointer, cache.register.type));
			} else {
				let expr = this.compile_expr(arg, false, true, ['call']);
				if (expr === false) {
					return false;
				}

				preamble.merge(expr.preamble);
				epilog.merge(expr.epilog);

				args.push(expr.instruction);
				signature.push(expr.type);
			}
		}



		// Link any [] accessors
		let accesses = [ ast.tokens[0].tokens[1].tokens ];
		let file = this.getFile();
		for (let access of ast.tokens[0].tokens[2]) {
			if (access.tokens[0] == "[]") {
				let out = [];
				for (let inner of access.tokens[1].tokens) {
					if (inner.type != "variable") {
						file.throw (
							`Error: Non-variable accessors are not allowed at this time`,
							inner.ref.start, inner.ref.end
						);
						return false;
					}

					let target = this.scope.getVar(inner, true);
					if (target.error !== true) {
						file.throw(
							`Error: Cannot processed variables withiin [] for function access`,
							inner.ref.start, inner.ref.end
						);
						return false;
					}

					let forward = Flattern.VariableList(inner);
					if (forward[0][0] != 0) {
						file.throw(
							`Error: Cannot dereference function call ${Flattern.VariableStr(inner)}`,
							inner.ref.start, inner.ref.end
						);
						return false;
					}

					target = file.getType(forward);

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

		// Link any template access
		let template = this.resolveTemplate(ast.tokens[1]);
		if (template === false) {
			return false;
		}

		// Find a function with the given signature
		let target = file.getFunction(accesses, signature, template);
		if (!target) {
			let funcName = Flattern.VariableStr(ast.tokens[0]);
			file.throw(
				`Error: Unable to find function "${funcName}" with signature ${signature.join(", ")}`,
				ast.ref.start, ast.ref.end
			);
			return false;
		}


		// Generate the LLVM for the call
		//   Mark any parsed pointers as now being concurrent
		if (target.isInline) {
			let inner = target.generate(regs, args);
			preamble.merge(inner.preamble);

			instruction = inner.instruction;
			returnType = inner.type;
		} else {
			instruction = new LLVM.Call(
				new LLVM.Type(target.returnType.type.represent, target.returnType.pointer, ast.ref.start),
				new LLVM.Name(target.represent, true, ast.tokens[0].ref),
				args,
				ast.ref.start
			);
			returnType = target.returnType;

			// Clear any lower caches
			//   If this is a pointer the value may have changed
			for (let arg of regs) {
				arg.isConcurrent = true;
				arg.clearCache();
			}

			// Mark this function as being called for the callgraph
			this.getFunction().addCall(target);
		}

		return { preamble, instruction, epilog, type: returnType };
	}

	/**
	 * Generates the LLVM for a call where the result is ignored
	 * @param {BNF_Reference} ast
	 * @returns {LLVM.Fragment}
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



	/**
	 * Generates LLVM for a variable declaration
	 * @param {BNF_Node} ast
	 * @returns {LLVM.Fragment}
	 */
	compile_declare(ast){
		let	name = ast.tokens[1].tokens;
		let frag = new LLVM.Fragment();

		let typeRef = this.getFunction().getType(
			ast.tokens[0],
			this.resolveTemplate(ast.tokens[0].tokens[3])
		);
		if (typeRef == null) {
			this.getFile().throw(`Error: Invalid type name "${Flattern.DataTypeStr(ast.tokens[0])}"`, ast.ref.start, ast.ref.end);
			return false;
		}

		// Update pointer level
		typeRef.pointer = ast.tokens[0].tokens[0];

		let reg = this.scope.register_Var(
			typeRef.type,
			typeRef.pointer+1,
			name,
			ast.ref.start
		);

		frag.append(new LLVM.Set(
			new LLVM.Name(reg.id, false, ast.tokens[1].ref.start),
			new LLVM.Alloc(
				new LLVM.Type(reg.type.represent, typeRef.pointer, ast.tokens[0].ref.start),
				reg.type.size,
				ast.ref.start
			),
			ast.ref.start
		));

		return frag;
	}
	/**
	 * Generates the LLVM for assigning a variable
	 * @param {BNF_Node} ast
	 * @returns {LLVM.Fragment}
	 */
	compile_assign (ast) {
		let frag = new LLVM.Fragment();

		// Resolve the expression
		let expr = this.compile_expr(ast.tokens[1], false, true);
		if (expr === false) {
			return false;
		}
		frag.merge(expr.preamble);

		// Load the target variable
		//   This must occur after the expression is resolve
		//   because this variable now needs to be accessed for writing
		//   after any reads that might have taken place in the expresion
		let load = this.scope.getVar(ast.tokens[0], false);
		if (load.error) {
			this.getFile().throw( load.msg, load.ref.start, load.ref.end );
			return false;
		}
		frag.merge(load.preamble);

		let targetType = new TypeRef(load.register.pointer-1, load.register.type);
		if (!expr.type.match(targetType)) {
			this.getFile().throw(
				`Error: Assignment type mis-match` +
				` cannot assign ${targetType.toString()}` +
				` to ${expr.type.toString()}`,
				ast.ref.start, ast.ref.end
			);
			return false;
		}

		if (expr.register) {
			load.register.clearCache(expr.register);
			load.register.markUpdated();
		} else {
			frag.append(new LLVM.Store(
				new LLVM.Argument(
					new LLVM.Type(load.register.type.represent, load.register.pointer),
					new LLVM.Name(`${load.register.id}`, false),
					ast.tokens[0].ref,
					Flattern.VariableStr(ast.tokens[0])
				),
				expr.instruction,
				load.register.type.size,
				ast.ref.start
			));
			load.register.clearCache();
		}

		frag.merge(expr.epilog);
		return frag;
	}
	/**
	 * Generates the LLVM for the combined action of define + assign
	 * @param {BNF_Node} ast
	 * @returns {LLVM.Fragment}
	 */
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
					tokens: [ 0, ast.tokens[1] ],
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
			returnType = new TypeRef(0, Primative.types.void);
		} else {
			let res = this.compile_expr(ast.tokens[0], this.returnType, true);
			returnType = res.type;
			frag.merge(res.preamble);
			inner = res.instruction;

			if (res.epilog.stmts.length > 0) {
				throw new Error("Cannot return using instruction with epilog");
			}
		}

		if (!this.returnType.match(returnType)) {
			this.getFile().throw(
				`Return type miss-match, expected ${this.returnType.toString()} but got ${returnType.toString()}`,
				ast.ref.start, ast.ref.end
			);
		}

		// Ensure that pointers actually write their data before returning
		frag.merge(this.scope.flushAllConcurrents(ast.ref));

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
		let cond = this.compile_expr(
			ast.tokens[0].tokens[0],
			new TypeRef(0, Primative.types.bool),
			true
		);
		if (cond.epilog.stmts.length > 0) {
			throw new Error("Cannot do an if-statement using instruction with epilog");
		}
		frag.merge(cond.preamble);


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
			cond.instruction,
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
		loop.merge(scope_loop.flushAllClones());

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
		let res = this.compile_expr(
			ast,
			new TypeRef(0, Primative.types.bool),
			true
		);

		if (res === false) {
			return false;
		}

		res.preamble.merge(res.epilog);
		return {
			instructions: res.preamble,
			register: res.instruction
		};
	}



	/**
	 *
	 * @param {BNF_Node} ast
	 * @param {Array[Number, TypeDef]} expects
	 * @param {Boolean} simple Simplifies the result to a single register when possible
	 */
	compile_expr (ast, expects = null, simple = false, block = []) {
		if (block.includes(ast.type)) {
			this.getFile().throw(
				`Error: Cannot call ${ast.type} within a nested expression`,
				ast.ref.start, ast.ref.end
			);
			return false;
		}

		let res = null;
		switch (ast.type) {
			case "constant":
				res = this.compile_constant(ast);
				break;
			case "call":
				res = this.compile_call(ast);
				break;
			case "variable":
				res = this.compile_loadVariable(ast);
				break;
			default:
				throw new Error(`Unexpected expression type ${ast.type}`);
		}

		if (res === false) {
			return false;
		}

		if (expects instanceof TypeRef && !expects.match(res.type)) {
			this.getFile().throw(
				`Error: Type miss-match, ` +
					`expected ${expects.toString()}, ` +
					`instead got ${res.type.toString()}`,
				ast.ref.start, ast.ref.end
			);
			return false;
		}

		/**
		 * Simplify result to a single register when;
		 *   - Simplifying is specified
		 *   - The value is not a constant
		 *   - The expected type is known
		 */
		if (
			simple &&
			!( res.instruction instanceof Argument )
		) {
			let inner = res.instruction;
			let irType = null;
			if (expects) {
				irType = new LLVM.Type(expects.type.represent, expects.pointer, ast.ref.start)
			} else {
				if (!inner.type) {
					throw new Error("Error: Cannot simplify due to undeduceable type");
				}
				irType = inner.type;
			}

			let id = this.scope.genID();

			res.register = new Register(id, res.type.type, "temp", res.type.pointer, ast.ref.start);
			let regIR = new LLVM.Name(id.toString(), false, ast.ref.start);

			res.preamble.append(new LLVM.Set(
				regIR,
				inner,
				ast.ref.start
			));
			res.instruction = new LLVM.Argument(
				irType,
				regIR,
				ast.ref.start
			);
		}

		return res;
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
		return this.scope.clearAllCaches();
	}

	flushAllClones() {
		return this.scope.flushAllClones();
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
