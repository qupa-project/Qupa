const Constant = require('./memory/constant.js');
const Register = require('./memory/register.js');
const Scope = require('./memory/scope.js');

const Flattern = require('../parser/flattern.js');
const LLVM     = require("../middle/llvm.js");
const TypeRef  = require('./typeRef.js');
const State    = require('./state.js');
const { Name } = require('../middle/llvm.js');

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
	constructor(ctx, returnType, scope, entryPoint = new LLVM.ID()) {
		this.ctx        = ctx;
		this.scope      = scope;
		this.returnType = returnType;
		this.returned   = false;
		this.isChild    = false;

		this.entryPoint = entryPoint.reference();
	}

	/**
	 * Return the function this scope is within
	 * @returns {Function_Instance}
	 */
	getFunction(access, signature, template) {
		return this.getFile().getFunction(access, signature, template);
	}

	getFunctionGroup () {
		return this.ctx.getFunctionGroup();
	}
	getFunctionInstance() {
		return this.ctx.getFunctionInstance();
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
	 * Get a register
	 * @param {*} ast
	 * @param {Boolean} read
	 */
	getVar(ast, read = true) {
		// Link dynamic access arguments
		ast = this.resolveAccess(ast);

		let res = this.scope.getVar(ast, read);

		// Inject reference if it is missing
		if (res.error) {
			res.ref = res.ref || ast.ref;
		}

		return res;
	}

	/**
	 * Load a variable ready for access
	 * @param {BNF_Node} ast
	 */
	compile_loadVariable(ast) {
		let frag = new LLVM.Fragment();

		let load = this.getVar(ast, true);
		if (load.error) {
			this.getFile().throw(load.msg, load.ref.start, load.ref.end);
			return null;
		}
		frag.merge(load.preamble);

		let cache = load.register.deref(this.scope, true, 1);
		if (cache === null || !cache.register) {
			this.getFile().throw(
				`Error: Cannot dereference ${Flattern.VariableStr(ast)}`,
				ast.ref.start, ast.ref.end
			);
			return null;
		}
		frag.merge(cache.preamble);

		return {
			instruction: cache.register.toLLVM(),
			preamble: frag,
			epilog: new LLVM.Fragment(),
			type: cache.register.type,
			register: cache.register
		};
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
					let type = this.getFile().getType(
						Flattern.DataTypeList(arg),
						this.resolveTemplate(arg.tokens[3])
					);
					if (type === null) {
						this.getFile().throw(
							`Error: Unknown data type ${Flattern.DataTypeStr(arg)}`,
							arg.ref.start, arg.ref.end
						);
						return null;
					}

					// Update pointer size
					type.pointer = arg.tokens[0];

					template.push(type);
					break;
				case "constant":
					template.push(this.compile_constant(arg));
					break;
				default:
					this.getFile().throw(
						`Error: ${arg.type} are currently unsupported in template arguments`,
						arg.ref.start, arg.ref.end
					);
					return null;
			}
		}

		return template;
	}

	/**
	 *
	 * @param {BNF_Node} node
	 */
	resolveType (node) {
		let template = this.resolveTemplate(node.tokens[3]);
		if (template === null) {
			return null;
		}

		return this.getFile().getType(
			Flattern.DataTypeList(node),
			template
		);
	}

	/**
	 * Resolves any dynamic access for the variable
	 * ALTERS original AST
	 * @param {*} ast
	 */
	resolveAccess (ast) {
		for (let access of ast.tokens[2]) {
			if (access[0] == "[]") {
				for (let i in access[1]) {
					let res = this.compile_expr(access[1][i], null, true);
					if (res === null) {
						return {
							error: true,
							msg: `Error: Unexpected dynamic access opperand type ${arg.type}`,
							ref: arg.ref
						};
					}

					access[1][i] = res;
				}
			}
		}

		return ast;
	}






	/**
	 * Generates the LLVM for a constant
	 * Used in other compile functions
	 * @param {BNF_Node} ast
	 */
	compile_constant(ast) {
		let preamble = new LLVM.Fragment();
		let type = null;
		let val = null;
		switch (ast.tokens[0].type) {
			case "float":
				type = new TypeRef(0, Primative.types.float);
				val = new LLVM.Constant(
					ast.tokens[0].tokens,
					ast.ref.start
				);
				break;
			case "boolean":
				type = new TypeRef(0, Primative.types.bool);
				val = new LLVM.Constant(
					val == "true" ? 1 : 0,
					ast.ref.start
				);
				break;
			case "integer":
				type = new TypeRef(0, Primative.types.i32);
				val = new LLVM.Constant(
					ast.tokens[0].tokens,
					ast.ref.start
				);
				break;
			case "string":
				let bytes = ast.tokens[0].tokens[1].length + 1;
				let str = ast.tokens[0].tokens[1].replace(/\"/g, "\\22").replace(/\n/g, '\\0A') + "\\00";

				let ir_t1 = new LLVM.Type(`[ ${bytes} x i8 ]`, 0, ast.ref);
				let ir_t2 = new LLVM.Type(`i8`, 1);

				let str_id = new LLVM.ID();
				let ptr_id = new LLVM.ID();

				preamble.append(new LLVM.Set(
					new LLVM.Name(str_id, false, ast.ref),
					new LLVM.Alloc(
						ir_t1,
						ast.ref
					),
					ast.ref
				));
				preamble.append(new LLVM.Store(
					new LLVM.Argument(
						new LLVM.Type(`[ ${bytes} x i8 ]*`, 0, ast.ref),
						new LLVM.Name(str_id.reference(), false, ast.ref),
						ast.ref, "#str_const"
					),
					new LLVM.Argument(
						ir_t1,
						new LLVM.Constant(`c"${str}"`, ast.ref),
						ast.ref
					)
				));
				preamble.append(new LLVM.Set(
					new LLVM.Name(ptr_id, false, ast.ref),
					new LLVM.Bitcast(
						ir_t2,
						new LLVM.Argument(
							new LLVM.Type(`[ ${bytes} x i8 ]*`, 0, ast.ref),
							new LLVM.Name(str_id.reference(), false, ast.ref),
							ast.ref, "#str_const"
						),
						ast.ref
					),
					ast.ref
				));

				type = new TypeRef(1, Primative.types.i8);
				val = new Name(ptr_id, false, ast.ref);
				break;
			default:
				throw new Error(`Unknown constant type ${ast.tokens[0].type}`);
		}

		return {
			instruction: new LLVM.Argument(
				new LLVM.Type(type.type.represent, type.pointer, ast.ref.start),
				val,
				ast.ref
			),
			preamble,
			epilog: new LLVM.Fragment(),
			type: type,
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
			let expr = this.compile_expr_opperand(arg);
			if (expr === null) {
				return null;
			}

			preamble.merge(expr.preamble);
			epilog.merge(expr.epilog);

			args.push(expr.instruction);
			signature.push(expr.type);

			if (expr.register instanceof Register) {
				preamble.merge(expr.register.flushCache());
				regs.push(expr.register);
			}
		}



		// Link any [] accessors
		let accesses = [ ast.tokens[0].tokens[1].tokens ];
		let file = this.getFile();
		for (let access of ast.tokens[0].tokens[2]) {
			if (access[0] == "[]") {
				file.throw (
					`Error: Class base function execution is currently unsupported`,
					inner.ref.start, inner.ref.end
				);
				return null;
			} else {
				accesses.push([access[0], access[1].tokens]);
			}
		}

		// Link any template access
		let template = this.resolveTemplate(ast.tokens[1]);
		if (template === null) {
			return null;
		}

		// Find a function with the given signature
		let target = this.getFunction(accesses, signature, template);
		if (!target) {
			let funcName = Flattern.VariableStr(ast.tokens[0]);
			file.throw(
				`Error: Unable to find function "${funcName}" with signature ${signature.join(", ")}`,
				ast.ref.start, ast.ref.end
			);
			return null;
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
			this.getFunctionInstance().addCall(target);
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
		if (out === null) {
			return null;
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

		let typeRef = this.resolveType(ast.tokens[0]);
		if (!(typeRef instanceof TypeRef)) {
			this.getFile().throw(`Error: Invalid type name "${Flattern.DataTypeStr(ast.tokens[0])}"`, ast.ref.start, ast.ref.end);
			return null;
		}

		// Update pointer level
		typeRef.pointer = ast.tokens[0].tokens[0];

		let reg = this.scope.register_Var(
			typeRef.duplicate().offsetPointer(1),
			name,
			ast.ref.start
		);

		frag.append(new LLVM.Set(
			new LLVM.Name(reg.id, false, ast.tokens[1].ref.start),
			new LLVM.Alloc(
				reg.type.duplicate().offsetPointer(-1).toLLVM(),
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
		if (expr === null) {
			return null;
		}
		frag.merge(expr.preamble);

		// Load the target variable
		//   This must occur after the expression is resolve
		//   because this variable now needs to be accessed for writing
		//   after any reads that might have taken place in the expresion
		let load = this.getVar(ast.tokens[0], false);
		if (load.error) {
			this.getFile().throw( load.msg, load.ref.start, load.ref.end );
			return null;
		}
		frag.merge(load.preamble);

		let targetType = load.register.type.duplicate().offsetPointer(-1);
		if (!expr.type.match(targetType)) {
			this.getFile().throw(
				`Error: Assignment type mis-match` +
				` cannot assign ${targetType.toString()}` +
				` to ${expr.type.toString()}`,
				ast.ref.start, ast.ref.end
			);
			return null;
		}

		if (expr.register) {
			load.register.clearCache(expr.register);
		} else {
			load.register.clearCache(new Constant(expr.type, expr.instruction.name.val, expr.ref.start), expr.ref.start);
		}

		load.register.markUpdated();
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
		if (declare == null) {
			return null;
		}
		frag.merge(declare);

		let forward = {
			type: "assign",
			tokens: [
				{
					type: "variable",
					tokens: [ 0, ast.tokens[1], [] ],
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
		if (assign === null) {
			return null;
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
			if (res === null) {
				return null;
			}
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
		frag.merge(this.compile_cleanup(ast.ref));

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
		let true_id = new LLVM.ID(ast.tokens[0].tokens[1].ref);
		let scope_true = this.clone();
		scope_true.entryPoint = true_id;
		let body_true = scope_true.compile(ast.tokens[0].tokens[1]);
		body_true.prepend(new LLVM.Label(
			true_id,
			ast.tokens[0].tokens[1].ref
		).toDefinition());
		body_true.merge(scope_true.flushAllClones());


		/**
		 * Prepare condition false body
		 */
		let hasElse = ast.tokens[2] !== null;
		let false_id = new LLVM.ID();
		let body_false = new LLVM.Fragment();
		let scope_false = this.clone();
		scope_false.entryPoint = false_id;
		if (hasElse) {
			body_false = scope_false.compile(ast.tokens[2].tokens[0]);
			body_false.prepend(new LLVM.Label(
				false_id
			).toDefinition());
			body_false.merge(scope_false.flushAllClones());
		}


		/**
		 * Cleanup and merging
		 */
		let endpoint_id = new LLVM.ID();
		let endpoint = new LLVM.Label(
			new LLVM.Name(endpoint_id.reference(), false)
		);


		// Push the branching jump
		frag.append(new LLVM.Branch(
			cond.instruction,
			new LLVM.Label(
				new LLVM.Name(true_id.reference(), false, ast.tokens[0].tokens[1].ref),
				ast.tokens[0].tokens[1].ref
			),
			new LLVM.Label(
				new LLVM.Name( hasElse ? false_id.reference() : endpoint_id.reference() , false)
			),
			ast.ref.start
		));



		// Prepare the synchronisation pre-process for each branch
		let sync = this.mergeUpdates([
			scope_true,
			hasElse ? scope_false : this
		]);
		body_true.merge  (sync.frags[0]);
		body_false.merge (sync.frags[1]);



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
			frag.append(new LLVM.Label(
				endpoint_id
			).toDefinition());
		}




		// Push the final clean up an synchronisation
		frag.merge(sync.sync);

		// Mark current branch
		this.entryPoint = hasElse ? false_id : endpoint_id;

		return frag;
	}


	compile_while (ast) {
		let frag = new LLVM.Fragment();

		let check_id = new LLVM.ID(ast.tokens[0].ref);
		let loop_id  = new LLVM.ID(ast.tokens[1].ref);
		let end_id   = new LLVM.ID();


		// Loop Entry
		let scope_check = this.clone();
		let check = scope_check.compile_while_condition(ast.tokens[0]);
		if (check === null) {
			return null;
		}
		check.instructions.append(new LLVM.Branch(
			check.register,
			new LLVM.Label(
				new LLVM.Name(loop_id.reference(), false, ast.tokens[0].tokens[0]),
				ast.tokens[0].tokens[0]
			),
			new LLVM.Label(
				new LLVM.Name(end_id.reference(), false, ast.tokens[0].tokens[0]),
				ast.tokens[0].tokens[0]
			),
			ast.ref.start
		));


		// Compute Loop
		let scope_loop = scope_check.clone();
		scope_loop.entryPoint = loop_id;
		let recurr = scope_loop.scope.prepareRecursion(this.entryPoint.reference());
		let loop = scope_loop.compile(ast.tokens[1]);
		if (loop === null) {
			return null;
		}

		// Add any preparation needed before entry to the loop
		check.instructions.merge(recurr.prolog);
		frag.merge(check.instructions);


		// Recursion check
		frag.append(new LLVM.Label(check_id, check_id.ref).toDefinition());
		scope_check = scope_loop.clone();
		scope_check.entryPoint = check_id;
		check = scope_check.compile_while_condition(ast.tokens[0]);
		if (check === null) {
			return null;
		}
		frag.merge(check.instructions);
		frag.append(new LLVM.Branch(
			check.register,
			new LLVM.Label(
				new LLVM.Name(loop_id.reference(), false, loop_id.ref),
				ast.tokens[0].tokens[0]
			),
			new LLVM.Label(
				new LLVM.Name(end_id.reference(), false, loop_id.ref),
				ast.tokens[0].tokens[0]
			),
			ast.ref.start
		));



		// Resolve loop values
		let recurr_resolve = scope_loop.scope.resolveRecursion(
			recurr.state,
			scope_check.entryPoint
		);
		loop.merge_front(recurr_resolve.prolog);
		loop.merge(recurr_resolve.epilog);



		// If any variables were updated within child scopes
		//   Flush their caches if needed
		scope_loop.entryPoint = scope_check.entryPoint;
		let sync = this.mergeUpdates([this, scope_loop]);
		frag.merge(sync.frags[0]);
		loop.merge(sync.frags[1]);


		// Insert loop instructions
		frag.append(new LLVM.Label(loop_id, loop_id.ref).toDefinition());
		frag.merge(loop);
		// Jump to the check
		frag.append(new LLVM.Branch_Unco(new LLVM.Label(
			new LLVM.Name(check_id.reference(), false, ast.tokens[0].ref),
			ast.tokens[0].tokens[0]
		)));


		// End point
		frag.append(new LLVM.Label(end_id, end_id.ref).toDefinition());

		this.entryPoint = end_id;
		frag.merge(sync.sync);

		return frag;
	}
	compile_while_condition(ast) {
		let res = this.compile_expr(
			ast,
			new TypeRef(0, Primative.types.bool),
			true
		);

		if (res === null) {
			return null;
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
	compile_expr (ast, expects = null, simple = false, block = false) {
		let recursiveFail = false;
		let res = null;
		switch (ast.type) {
			case "constant":
				res = this.compile_constant(ast);
				break;
			case "call":
				if (block) {
					recursiveFail = true;
					break;
				}

				res = this.compile_call(ast);
				break;
			case "variable":
				res = this.compile_loadVariable(ast);
				break;
			case "expr_arithmetic":
				res = this.compile_expr_arithmetic(ast.tokens[0]);
				break;
			case "expr_compare":
				res = this.compile_expr_compare(ast.tokens[0]);
				break;
			case "expr_bool":
				res = this.compile_expr_bool(ast.tokens[0]);
				break;
			default:
				throw new Error(`Unexpected expression type ${ast.type}`);
		}

		if (recursiveFail) {
			this.getFile().throw(
				`Error: Recursive expression are not allowed at this stage`,
				ast.ref.start, ast.ref.end
			);
			return null;
		}

		if (res === null) {
			return null;
		}

		if (expects instanceof TypeRef && !expects.match(res.type)) {
			this.getFile().throw(
				`Error: Type miss-match, ` +
					`expected ${expects.toString()}, ` +
					`instead got ${res.type.toString()}`,
				ast.ref.start, ast.ref.end
			);
			return null;
		}

		/**
		 * Simplify result to a single register when;
		 *   - Simplifying is specified
		 *   - The value is not a constant
		 *   - The expected type is known
		 */
		if (
			simple &&
			!( res.instruction instanceof LLVM.Argument )
		) {
			let inner = res.instruction;
			let irType = null;
			if (expects) {
				irType = new LLVM.Type(expects.type.represent, expects.pointer, ast.ref.start)
			} else {
				if (!res.type) {
					throw new Error("Error: Cannot simplify due to undeduceable type");
				}
				irType = res.type;
			}

			res.register = new Register(res.type, "temp", ast.ref.start);
			let regIR = res.register.toLLVM();

			res.preamble.append(new LLVM.Set(
				regIR.name,
				inner,
				ast.ref.start
			));
			res.instruction = regIR;
		}

		res.ref = ast.ref;
		return res;
	}

	compile_expr_opperand (ast) {
		switch (ast.type) {
			case "variable":
				return this.compile_loadVariable(ast);
			case "constant":
				return this.compile_constant(ast);
			default:
				throw new Error(`Unexpected expression opperand type ${ast.type}`);
		}
	}

	compile_expr_arithmetic(ast) {
		let action = null;
		switch (ast.type) {
			case "expr_add":
				action = "Add";
				break;
			case "expr_sub":
				action = "Sub";
				break;
			case "expr_mul":
				action = "Mul";
				break;
			case "expr_div":
				action = "Div";
				break;
			case "expr_mod":
				action = "Rem";
				break;
			default:
				throw new Error(`Unexpected arithmetic expression type ${ast.type}`);
		}



		let preamble = new LLVM.Fragment();
		let epilog = new LLVM.Fragment();

		// Load the two operands ready for operation
		let opperands = [
			this.compile_expr_opperand(ast.tokens[0]),
			this.compile_expr_opperand(ast.tokens[2])
		];

		// Append the load instructions
		preamble.merge(opperands[0].preamble);
		preamble.merge(opperands[1].preamble);

		// Append the cleanup instructions
		epilog.merge(opperands[0].epilog);
		epilog.merge(opperands[1].epilog);



		// Check opperands are primatives
		if (!opperands[0].type.type.primative) {
			this.getFile().throw(
				`Error: Cannot run arithmetic opperation on non-primative type`,
				ast.tokens[0].ref.start, ast.tokens[0].ref.end
			);
			return null;
		}
		if (!opperands[1].type.type.primative) {
			this.getFile().throw(
				`Error: Cannot run arithmetic opperation on non-primative type`,
				ast.tokens[2].ref.start, ast.tokens[2].ref.end
			);
			return null;
		}


		// Check opperands are the same type
		if (!opperands[0].type.match(opperands[1].type)) {
			this.getFile().throw(
				`Error: Cannot perform arithmetic opperation on unequal types`,
				ast.tokens[0].ref.start, ast.tokens[2].ref.end
			);
			return null;
		}


		// Get the arrithmetic mode
		let mode = null;
		if (opperands[0].type.type.cat == "int") {
			mode = opperands[0].type.type.signed ? 0 : 1;
		} else if (opperands[0].type.type.cat == "float") {
			mode = 2;
		}
		if (mode === null) {
			this.getFile().throw(
				`Error: Unable to perform arithmetic opperation for unknown reason`,
				ast.tokens[1].ref.start, ast.tokens[1].ref.end
			);
			return null;
		}



		return {
			preamble, epilog,
			instruction: new LLVM[action](
				mode,
				opperands[0].instruction.type,
				opperands[0].instruction.name,
				opperands[1].instruction.name
			),
			type: opperands[0].type
		};
	}

	compile_expr_compare(ast) {
		let preamble = new LLVM.Fragment();
		let epilog = new LLVM.Fragment();


		// Load the two operands ready for operation
		let opperands = [
			this.compile_expr_opperand(ast.tokens[0]),
			this.compile_expr_opperand(ast.tokens[2])
		];


		// Check opperands are primatives
		if (!opperands[0].type.type.primative) {
			this.getFile().throw(
				`Error: Cannot perform comparison opperation on non-primative type`,
				ast.tokens[0].ref.start, ast.tokens[0].ref.end
			);
			return null;
		}
		if (!opperands[1].type.type.primative) {
			this.getFile().throw(
				`Error: Cannot perform comparison opperation on non-primative type`,
				ast.tokens[2].ref.start, ast.tokens[2].ref.end
			);
			return null;
		}


		// Check opperands are the same type
		if (!opperands[0].type.match(opperands[1].type)) {
			this.getFile().throw(
				`Error: Cannot perform comparison opperation on unequal types`,
				ast.tokens[0].ref.start, ast.tokens[2].ref.end
			);
			return null;
		}


		// Get the arrithmetic mode
		let mode = null;
		if (opperands[0].type.type.cat == "int") {
			mode = opperands[0].type.type.signed ? 0 : 1;
		} else if (opperands[0].type.type.cat == "float") {
			mode = 2;
		}
		if (mode === null) {
			this.getFile().throw(
				`Error: Unable to perform comparison opperation for unknown reason`,
				ast.tokens[1].ref.start, ast.tokens[1].ref.end
			);
			return null;
		}


		let cond = null;
		switch (ast.type) {
			case "expr_eq":
				cond = mode == 2 ? "oeq" : "eq";
				break;
			case "expr_neq":
				cond = mode == 2 ? "une" : "ne";
				break;
			case "expr_gt":
				cond = mode == 0 ? "ugt" :
					mode == 1 ? "sgt" :
					"ogt";
				break;
			case "expr_gt_eq":
				cond = mode == 0 ? "uge" :
					mode == 1 ? "sge" :
					"oge";
				break;
			case "expr_lt":
				cond = mode == 0 ? "ult" :
					mode == 1 ? "slt" :
					"olt";
				break;
			case "expr_lt_eq":
				cond = mode == 0 ? "ule" :
					mode == 1 ? "sle" :
					"ole";
				break;
			default:
				throw new Error(`Unexpected comparison expression type ${ast.type}`);
		}


		// Append the load instructions
		preamble.merge(opperands[0].preamble);
		preamble.merge(opperands[1].preamble);

		// Append the cleanup instructions
		epilog.merge(opperands[0].epilog);
		epilog.merge(opperands[1].epilog);



		return {
			preamble, epilog,
			instruction: new LLVM.Compare(
				mode,
				cond,
				opperands[0].instruction.type,
				opperands[0].instruction.name,
				opperands[1].instruction.name
			),
			type: new TypeRef(0, Primative.types.bool)
		};
	}

	compile_expr_bool(ast) {
		let preamble = new LLVM.Fragment();
		let epilog = new LLVM.Fragment();


		let opperands = [];
		let action = null;
		let type = new TypeRef(0, Primative.types.bool);
		switch (ast.type) {
			case "expr_and":
			case "expr_or":
				action = ast.type == "expr_and" ? "And" : "Or";
				opperands = [
					this.compile_expr_opperand(ast.tokens[0]),
					this.compile_expr_opperand(ast.tokens[2])
				];
				break;
			case "expr_not":
				action = "XOr";
				opperands = [
					this.compile_expr_opperand(ast.tokens[0]),
					{
						preamble: new LLVM.Fragment(),
						epilog: new LLVM.Fragment(),
						instruction: new LLVM.Constant("true"),
						type
					}
				];
				break;
			default:
				throw new Error(`Unexpected boolean expression type ${ast.type}`);
		}


		// Check opperands are of boolean type
		if (!opperands[0].type.match(type)) {
			this.getFile().throw(
				`Error: Cannot perform boolean opperation on non boolean types`,
				ast.tokens[0].ref.start, ast.tokens[0].ref.end
			);
			return null;
		}
		if (!opperands[1].type.match(type)) {
			this.getFile().throw(
				`Error: Cannot perform boolean opperation on non boolean types`,
				ast.tokens[2].ref.start, ast.tokens[2].ref.end
			);
			return null;
		}


		// Append the load instructions
		preamble.merge(opperands[0].preamble);
		preamble.merge(opperands[1].preamble);

		// Append the cleanup instructions
		epilog.merge(opperands[0].epilog);
		epilog.merge(opperands[1].epilog);


		let instruction = new LLVM[action](
			opperands[0].instruction.type,
			opperands[0].instruction.name,
			action == "XOr" ? opperands[1].instruction : opperands[1].instruction.name
		);

		return {
			preamble, epilog,
			instruction,
			type
		};
	}




	compile_cleanup (ref) {
		return this.scope.flushAllConcurrents(ref);
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
				case "call":
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
	 * @param {Execution[]} child the scope to be merged
	 * @param {Boolean} alwaysExecute If this scope will always execute and is non optional (i.e. not if statement)
	 * @returns {LLVM.Fragment[]}
	 */
	mergeUpdates(children) {
		if ( !Array.isArray(children) || children.length < 1) {
			throw new Error("Cannot merge a zero children");
		}

		// Synchornise this scope to others
		let output = this.scope.syncScopes(
			children.map( x => x.scope ),
			children.map( x => x.entryPoint )
		);


		// Determine definite return
		let allReturned = true;
		for (let child of children) {
			if (child.returned == false) {
				allReturned = false;
				break;
			}
		}
		this.returned = allReturned;



		return output;
	}
}

module.exports = Execution;
