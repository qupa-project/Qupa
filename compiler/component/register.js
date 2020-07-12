const LLVM = require('./../middle/llvm.js');
const TypeDef = require('./typedef.js');

class Register {
	/**
	 * 
	 * @param {Number} id 
	 * @param {TypeDef|Structure} type 
	 * @param {String} name 
	 * @param {Number} pointerDepth 
	 * @param {BNF_Reference} ref 
	 */
	constructor(id, type, name, pointerDepth, ref) {
		this.id         = id;
		this.type       = type;
		this.name       = name;
		this.pointer    = pointerDepth;
		this.declared   = ref;
		this.inner      = [];
		this.cache      = null;
		this.isClone    = false;
		this.concurrent = false;
	}

	get(ast, scope, read = true) {
		let preamble = new LLVM.Fragment();
		let register = this;

		// Do dereferencing if required
		if (ast[0][0] == "->") {
			if (this.pointer != 2) {
				return {
					error: true,
					msg: `Type Error: Cannot dereference a non pointer value`,
					ref: {
						start: ast[0][1].ref.start,
						end: ast[0][1].ref.end
					}
				};
			} else {
				let load = this.deref(scope, read, 1);
				if (load == null) {
					return {
						error: true,
						msg: `Internal Error: Cannot dereference for unknown reason`,
						start: ast[0][1].ref.start,
						end: ast[0][1].ref.end,
					};
				} else {
					preamble.merge(load.preamble);
					register = load.register;
				}
			}
		} else if (ast[0][0] == ".") {
			if (this.pointer != 1) {
				return {
					error: true,
					msg: `Internal Error: Cannot get sub element of direct value`,
					ref: {
						start: ast[0][1].ref.start,
						end: ast[0][1].ref.end
					}
				};
			}
		} else {
			return {
				error: true,
				msg: `Internal Error: Unknown access operation ${ast[0][0]}`,
				ref: {
					start: ast[0][1].ref.start,
					end: ast[0][1].ref.end
				}
			};
		}

		// Remove the dereference of this structure
		//   as it's elements has been changed
		if (!read) {
			if (register.cache) {
				register.cache.clearCache();
			}
			register.cache = null;
		}

		// Check the index of the term
		let search = register.type.getTerm(ast[0][1].tokens);
		if (search === null) {
			return {
				error: true,
				msg: `Type Error: Unknown term ${ast[0][1].tokens} of structure ${register.type.name}`,
				ref: {
					start: ast[0][1].ref.start,
					end: ast[0][1].ref.end
				}
			};
		}


		// Create an address cache if needed
		if (!register.inner[search.index]) {
			let reg = new Register(
				scope.generator.next(),
				search.term.type,
				search.term.name,
				search.term.pointer+1,
				ast[0][1].ref
			);
			register.inner[search.index] = reg;

			preamble.append(new LLVM.Set(
				new LLVM.Name(reg.id, false, reg.declared),
				new LLVM.GEP(
					new LLVM.Type(register.type.represent, register.pointer-1, reg.declared),
					new LLVM.Name(register.id, false, ast[0][1].ref),
					[
						new LLVM.Constant(new LLVM.Type("i32", 0), "0"),
						new LLVM.Constant(new LLVM.Type("i32", 0), search.index.toString())
					],
					ast[0][1].ref
				),
				ast[0][1].ref
			));
		}
		register = register.inner[search.index];


		// If further access is required
		//  Re-occure
		if (ast.length > 1) {
			let inner = register.get(ast.slice(1), scope, read);
			if (inner.error) {
				return inner;
			} else {
				preamble.merge(inner.preamble);
				register = inner.register;
			}
		}

		return {
			register,
			preamble
		};
	}

	markUpdated(ref) {
		return this.clearCache(ref);
	}

	/**
	 * Forces caches to write data to the correct location
	 * @param {BNF_Reference} ref 
	 */
	flushCache(ref, replacement = null) {
		let frag = new LLVM.Fragment();

		if (this.cache) {
			frag.merge(this.cache.flushCache());

			frag.append(new LLVM.Store(
				new LLVM.Argument(
					new LLVM.Type(this.type.represent, this.pointer),
					new LLVM.Name(this.id, false)
				),
				new LLVM.Argument(
					new LLVM.Type(this.type.represent, this.cache.pointer),
					new LLVM.Name(this.cache.id, false)
				),
				this.type.size,
				ref
			));
		}
		this.cache = replacement;

		return frag;
	}

	/**
	 * Dumps all caches, forcing reloads
	 */
	clearCache(ref) {
		if (this.cache) {
			this.cache.clearCache(ref);
		}
		this.inner = [];
		this.cache = null;
	}

	deref(scope, read = true, amount = 1) {
		// Cannot dereference a value
		// Handle error within caller
		if (this.pointer == 0) {
			return null;
		}

		let out = {
			preamble: new LLVM.Fragment(),
			register: this.cache
		};

		// If a new cache needs to be generated because:
		//  a) something needs to be written and LLVM registers are constant value
		//  b) the value of this reference has not yet been cached
		if (!read || this.cache === null || amount > 1) {
			this.cache = new Register(
				scope.generator.next(),
				this.type,
				this.name,
				this.pointer-1
			);
			out.register = this.cache;

			// If the value is going to be read, loads in the cache value
			// Otherwise leave the assigned register unused
			if (read || amount > 1) {
				out.preamble.append(new LLVM.Set(
					new LLVM.Name(`${this.cache.id}`, false),
					new LLVM.Load(
						new LLVM.Type(this.type.represent, this.pointer-1),
						new LLVM.Name(`${this.id}`, false),
						this.type.size
					)
				));
			}
		}

		if (amount > 1) {
			let next = this.cache.deref(scope, read, amount-1);
			out.register = next.register;
			out.preamble.merge(next.preamble);
		}

		return out;
	}

	/**
	 * Deep clone
	 * @returns {Register}
	 */
	clone () {
		let out = new Register(this.id, this.type, this.name, this.pointer, this.ref);
		if (this.cache !== null) {
			out.cache = this.cache.clone();
		}
		out.isClone = true;

		return out;
	}
	/**
	 * Marks this copy as the original instead of a clone
	 * Applies recursively
	 */
	declone() {
		this.isClone = false;

		if (this.cache) {
			this.cache.declone();
		}
	}

	/**
	 * Updates any caches due to alterations in child scope
	 * @param {Register} other the register to be merged
	 * @param {Boolean} alwaysExecute If this change ALWAYS execute
	 */
	mergeUpdates(other, alwaysExecute) {
		let action = 0; // 0 = no action, 1 = clear cache, 2 = copy new cache
		if (this.cache !== null && other.cache == null) {                          // a cache was destroyed
			action = 1;
		} else if (alwaysExecute && this.cache === null && other.cache !== null) { // a cache was created
			action = 2;
		} else if (this.cache !== null && other.cache !== null && this.cache.id != other.cache.id) { // a cache was updated
			action = alwaysExecute ? 2 : 1;
		}

		switch (action) {
			case 0:
				break;
			case 1:
				this.clearCache();
				break;
			case 2:
				this.clearCache();
				this.cache = other.cache.clone();
				this.cache.declone();
				break;
		}
	}
}

module.exports = Register;