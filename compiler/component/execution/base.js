const Scope = require('../memory/scope.js');
const Flattern = require('../../parser/flattern.js');
const LLVM     = require("../../middle/llvm.js");

class ExecutionBase {
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

	clone() {
		throw new TypeError("Unimplemented abstract class");
	}
}

module.exports = ExecutionBase;
