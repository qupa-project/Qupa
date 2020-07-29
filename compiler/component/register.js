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
		this.id           = id;
		this.type         = type;
		this.name         = name;
		this.pointer      = pointerDepth;
		this.declared     = ref;
		this.inner        = {};
		this.cache        = null;
		this.isClone      = false;
		this.isConcurrent = false;
		this.writePending = false;
	}



	get(ast, scope, read = true) {
		let preamble = new LLVM.Fragment();
		let register = this;
		let dynamic = false;
		let ref = null;




		// Do required dereferencing
		while (ast.length > 0 && ast[0][0] == "->") {
			if (this.pointer != 2) {
				return {
					error: true,
					msg: `Type Error: Cannot dereference a non pointer value`,
					ref
				};
			} else {
				let load = this.deref(scope, read, 1);
				if (load == null) {
					return {
						error: true,
						msg: `Internal Error: Cannot dereference for unknown reason`,
						ref
					};
				} else {
					preamble.merge(load.preamble);
					register = load.register;
				}
				ast.splice(0, 1);
			}
		}




		// Check access type
		let match = false;
		if (ast.length > 0) {
			if (ast[0][0] == ".") {
				ref = ast[0][1].ref;
				match = true;
			} else if (ast[0][0] == "[]") {
				if (ast[0][1].length > 0)
					ref = ast[0][1].ref;

				dynamic = true;
				match = true;
			}
		}

		if (!match) {
			return {
				error: true,
				msg: `Internal Error: Unknown access operation ${ast[0][0]}`,
				ref: {
					start: ast.ref.start,
					end: ast.ref.end
				}
			};
		}




		// Check the pointer depth
		if (register.pointer != 1) {
			return {
				error: true,
				msg: `Reference Error: Cannot ${dynamic ? " dynamically" : ""}access element at this pointer depth`,
				ref
			};
		}




		// Check the index of the term
		let search = dynamic ?
			register.type.getElement(ast[0][1], register) :
			register.type.getTerm(ast[0][1], register);
		if (search === null) {
			return {
				error: true,
				msg: `Type Error: Unknown acccess of structure ${register.type.name}`,
				ref
			};
		}

		preamble.merge(search.preamble);

		// All of GEPs need to be flushed as they migh be affected
		if (!read) {
			preamble.merge( this.flushGEPCaches( ast[0][1].ref, search.signature) );
			this.clearGEPCaches(search.signature);

			// If a GEP has been updated the cache will need to be reloaded
			if (this.cache) {
				this.cache.clearCache();
			}
		} else if (this.cache) {
			preamble.merge(this.flushCache(ast[0][1].ref, false));
		}


		// Create an address cache if needed
		if (!register.inner[search.signature]) {
			let reg = new Register(
				scope.generator.next(),
				search.typeRef.type,
				"temp",
				search.typeRef.pointer+1,
				ast[0][1].ref
			);
			register.inner[search.signature] = reg;

			preamble.append(new LLVM.Set(
				new LLVM.Name(reg.id, false, reg.declared),
				search.instruction,
				ast[0][1].ref
			));
		}
		register = register.inner[search.signature];



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

		if (read) {
			preamble.merge( register.flushCache(ast.ref) );
		} else {
			register.markUpdated();
		}
		return {
			register,
			preamble
		};
	}



	/**
	 *
	 * @param {BNF_Reference?} ref
	 * @returns {void}
	 */
	markUpdated(ref) {
		this.writePending = true;
	}

	/**
	 * Forces write pending caches to write data to the correct location
	 * @param {BNF_Reference?} ref
	 * @returns {LLVM.Fragment?}
	 */
	flushCache(ref, allowGEP = true) {
		let frag = new LLVM.Fragment();

		if (this.cache) {
			frag.merge(this.cache.flushCache());

			if (this.writePending) {
				frag.append(new LLVM.Store(
					new LLVM.Argument(
						new LLVM.Type(this.type.represent, this.pointer),
						new LLVM.Name(this.id, false)
					),
					new LLVM.Argument(
						new LLVM.Type(this.type.represent, this.cache.pointer),
						new LLVM.Name(this.cache.id, false)
					),
					ref
				));
				this.cache.writePending = false;
			}
		} else if (allowGEP) {
			this.flushGEPCaches(ref);
		}

		this.writePending = false;
		return frag;
	}

	flushGEPCaches(ref, ignore = null) {
		let frag = new LLVM.Fragment();

		for (let sig in this.inner) {
			if (ignore !== null && sig == ignore) {
				continue;
			}

			frag.merge(this.inner[sig].flushCache(ref));
		}

		this.writePending = false;
		return frag;
	}

	/**
	 * Clears the caches of all GEPs
	 * This will mark this register as having no writes pending
	 */
	clearGEPCaches(ignore) {
		let frag = new LLVM.Fragment();

		for (let sig in this.inner) {
			if (ignore !== null && sig == ignore) {
				continue;
			}

			this.inner[sig].clearCache();
		}

		this.writePending = false;
		return frag;
	}

	/**
	 * Dumps all caches, forcing reloads
	 * @param {Register} cache A cache that may replace this one
	 * @returns {void}
	 */
	clearCache(replacement = null, allowGEP = true) {
		this.cache = replacement;
		this.writePending = false;

		if (allowGEP) {
			this.inner = [];

			for (let sig in this.inner) {
				if (this.inner[sig].writePending) {
					this.writePending = true;
					break;
				}
			}
		}
	}




	/**
	 * Creates a cache and loads the data from this register as a pointer
	 * This will flush any GEPs if read is true
	 * @param {Scope} scope
	 * @param {Boolean} read
	 * @param {Number} amount
	 */
	deref(scope, read = true, amount = 1) {
		// Cannot dereference a value
		// Handle error within caller
		if (this.pointer == 0 && amount > 0) {
			return null;
		}

		let out = {
			preamble: new LLVM.Fragment(),
			register: this.cache
		};

		// Wipe all GEP's caches
		//   As their data is about to be over written
		if (read) {
			let data = this.flushGEPCaches();
			out.preamble.merge(data);
			if (data.stmts.length > 0) {
				this.clearCache(null, false);
			}
		} else {
			this.clearGEPCaches();
		}

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
						new LLVM.Name(`${this.id}`, false)
					)
				));
			}
		}


		if (amount > 1) {
			let next = this.cache.deref(scope, read, amount-1);
			if (next === null) {
				console.log('FAIL');
				return null;
			}

			out.register = next.register;
			out.preamble.merge(next.preamble);
		}

		if (!read) {
			this.markUpdated();
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
		// This is now a concurrent pointer
		if (other.isConcurrent) {
			this.isConcurrent = true;
		}

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


	toLLVM(ref) {
		return new LLVM.Argument(
			new LLVM.Type(this.type.represent, this.pointer, this.declared),
			new LLVM.Name(this.id.toString(), false, this.declared),
			ref,
			this.name
		);
	}
}

module.exports = Register;