const { Generator_ID } = require('./generate.js');
const LLVM = require("../middle/llvm.js");
const Flattern = require('../parser/flattern.js');
const Register = require('./register.js');
const TypeRef = require('./typeRef.js');

class Scope {
	static raisedVariables = true; // whether or not a variable can be redefined within a new scope

	constructor(ctx, caching = true, id_generator = new Generator_ID(1)) {
		this.ctx        = ctx;
		this.variables  = {};
		this.generator  = id_generator;
		this.caching    = caching;
		this.isChild    = false;
	}



	/**
	 * Return the file of which this scope is within
	 * @returns {File}
	 */
	getFile () {
		return this.ctx.getFile();
	}

	/**
	 * Return the parent scope if this is a sub scope
	 * @returns {Scope|null}
	 */
	getParent() {
		if (this.ctx instanceof Scope) {
			return this.ctx;
		}
		return null;
	}

	/**
	 * Generates a new register ID
	 * @returns {Number}
	 */
	genID() {
		return this.generator.next();
	}



	/**
	 * Registers all arguments as local variables in correct order
	 * @param {Object[]} args
	 */
	register_Args(args) {
		this.generator.next(); // skip one id for function entry point

		let frag = new LLVM.Fragment();

		for (let arg of args) {
			if (this.variables[arg.name]) {
				this.getFile().throw(
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
			if (arg.pointer > 0) {
				this.variables[arg.name].isConcurrent = true;
			}

			let cache = new Register(
				arg.id,
				arg.type,
				arg.name,
				arg.pointer,
				arg.ref
			);
			this.variables[arg.name].cache = cache;
			cache.isConcurrent = arg.pointer > 0;

			frag.append(new LLVM.Set(
				new LLVM.Name(
					this.variables[arg.name].id,
					false,
					arg.ref
				),
				new LLVM.Alloc(
					new LLVM.Type(arg.type.represent, arg.pointer, arg.ref),
					arg.ref
				),
				arg.ref
			));
			this.variables[arg.name].markUpdated();
		}

		return frag;
	}



	/**
	 * Define a new variable
	 * @param {TypeDef} type
	 * @param {Number} pointerLvl
	 * @param {String} name
	 * @param {BNF_Reference} ref
	 * @returns {void}
	 */
	register_Var(type, pointerLvl, name, ref) {
		if (Scope.raisedVariables) {
			let parent = this.getParent();
			if (parent) {
				return parent.register_Var(type, pointerLvl, name, ref);
			}
		}

		if (this.variables[name]) {
			if (this.variables[name].isClone && !Scope.raisedVariables) {
				// When scoped variables are added
				// Ensure that any changes to the original are flushed before
				//   redeclaring
			}

			this.getFile().throw(
				`Duplicate declaration of name ${name} in scope`,
				this.variables[name].declared, ref
			);
		}

		this.variables[name] = new Register(this.generator.next(), type, name, pointerLvl, ref);
		return this.variables[name];
	}

	/**
	 * Get the register holding the desired value
	 * @param {BNF_Node} ast
	 * @param {Boolean} read Will this value be read? Or only written
	 * @returns {Object}
	 */
	getVar(ast, read = true) {
		if (ast.type != "variable") {
			throw new TypeError(`Parsed AST must be a branch of type variable, not "${ast.type}"`);
		}

		let preamble = new LLVM.Fragment();
		let target = this.variables[ast.tokens[1].tokens];
		if (target) {
			if (!this.caching) {
				target.clearCache();
			}

			if (ast.tokens[2] && ast.tokens[2].length > 0) {
				let load = target.get(ast.tokens[2], this, read);
				if (load.error) {
					return load;
				}
				preamble.merge(load.preamble);
				target = load.register;
			}
		} else {
			return {
				error: true,
				msg: `Unknown variable name ${ast.tokens[1].tokens}`,
				ref: {
					start: ast.tokens[1].ref.start,
					end: ast.tokens[1].ref.end
				}
			};
		}

		if (ast.tokens[0] > 0) {
			let load = target.deref(this, true, ast.tokens[0]);
			if (load === null) {
				return {
					error: true,
					msg: `Cannot dereference ${Flattern.VariableStr(ast)}`,
					ref: {
						start: ast.tokens[1].ref.start,
						end: ast.tokens[1].ref.end
					}
				};
			}

			preamble.merge(load.preamble);
			target = load.register;
		}

		if (!read) {
			target.markUpdated();
		}
		return {
			register: target,
			preamble: preamble
		};
	}

	/**
	 * Get the type of a given variable
	 * @param {BNF_Node} ast
	 */
	getVarType(ast) {
		if (ast.type != "variable") {
			throw new TypeError(`Parsed AST must be a branch of type variable, not "${ast.type}"`);
		}

		let target = this.variables[ast.tokens[1].tokens];
		if (target) {
			if (ast.tokens.length > 2) {
				let load = target.getTypeOf(ast.tokens.slice(2));
				if (load.error) {
					return load;
				}
				target = load.register;
			}
		} else {
			return {
				error: true,
				msg: `Unknown variable name ${ast.tokens[1].tokens}`,
				ref: {
					start: ast.tokens[1].ref.start,
					end: ast.tokens[1].ref.end
				}
			};
		}

		return new TypeRef (target.pointer - ast.tokens[0], target.type);
	}

	/**
	 * Returns true if this name is defined
	 * @param {String} name
	 * @returns {Bool}
	 */
	hasVariable(name) {
		return name in this.variables;
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
		out.child = true;

		return out;
	}

	/**
	 * Clears the cache of every
	 */
	clearAllCaches() {
		for (let name in this.variables) {
			this.variables[name].clearCache();
		}
	}

	/**
	 * Flush all cloned variables
	 * @param {BNF_Reference} ref
	 * @returns {LLVM.Fragment}
	 */
	flushAllClones (ref) {
		let frag = new LLVM.Fragment();

		for (let name in this.variables) {
			if (this.variables[name].isClone) {
				frag.merge( this.variables[name].flushCache(ref) );
			}
		}

		return frag;
	}

	flushAllConcurrents(ref) {
		let frag = new LLVM.Fragment();

		for (let name in this.variables) {
			if (this.variables[name].isConcurrent) {
				frag.merge( this.variables[name].flushCache(ref) );
			}
		}

		return frag;
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