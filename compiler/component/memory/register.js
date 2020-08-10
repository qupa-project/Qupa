const LLVM = require('../../middle/llvm.js');
const TypeRef = require('../typeRef.js');

const Constant = require('./constant.js');
const Value = require('./value.js');

class Register extends Value {
	/**
	 *
	 * @param {Number} id
	 * @param {TypeRef} type
	 * @param {String} name
	 * @param {Number} pointerDepth
	 * @param {BNF_Reference} ref
	 */
	constructor(type, name, ref) {
		super(type, ref);
		this.id           = new LLVM.ID();
		this.name         = name;
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
			if (this.type.pointer != 2) {
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
		if (register.type.pointer != 1) {
			return {
				error: true,
				msg: `Reference Error: Cannot ${dynamic ? " dynamically " : ""}access element at this pointer depth`,
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
				msg: `Type Error: Unknown acccess of structure ${register.type.getName()}`,
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
				search.typeRef.duplicate().offsetPointer(1),
				"temp",
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
			if (this.cache instanceof Register) {
				frag.merge(this.cache.flushCache());
			}

			if (this.writePending || frag.stmts.length > 0) {
				frag.append(new LLVM.Store(
					this.toLLVM(),
					this.cache.toLLVM(),
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

		this.writePending = frag.stmts.length > 0 ? false : this.writePending;
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
	 * @param {Value} cache A cache that may replace this one
	 * @param {Boolean} allowGEP also flush GEP caches?
	 * @returns {void}
	 */
	clearCache(replacement = null, allowGEP = true) {
		this.cache = replacement;
		this.writePending = false;

		if (allowGEP) {
			this.clearGEPCaches();

			for (let sig in this.inner) {
				if (this.inner[sig].writePending) {
					this.writePending = true;
					break;
				}
			}
		}
	}

	clearGEPAddresses() {
		this.inner = [];
	}




	/**
	 * Creates a cache and loads the data from this register as a pointer
	 * This will flush any GEPs if read is true
	 * @param {Scope} scope
	 * @param {Boolean} read
	 * @param {Number} amount
	 * @returns {Object?}
	 */
	deref(scope, read = true, amount = 1) {
		// Cannot dereference a value
		// Handle error within caller
		if (this.type.pointer == 0 && amount > 0) {
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
				this.type.duplicate().offsetPointer(-1),
				this.name
			);
			out.register = this.cache;

			// If the value is going to be read, loads in the cache value
			// Otherwise leave the assigned register unused
			if (read || amount > 1) {
				out.preamble.append(new LLVM.Set(
					this.cache.toLLVM().name,
					new LLVM.Load(
						this.type.duplicate().offsetPointer(-1).toLLVM(),
						this.toLLVM().name
					)
				));
			}
		}


		if (amount > 1) {
			let next = this.cache.deref(scope, read, amount-1);
			if (next === null) {
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
		let out = new Register(this.type, this.name, this.ref);
		out.id = this.id;
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
		} else if (this.cache !== null && other.cache !== null && (
			this.cache.id != other.cache.id ||
			this.cache instanceof Constant !== other.cache instanceof Constant ||
			( this.cache instanceof Constant && other.cache instanceof Constant && this.cache.value != other.cache.value )
		)) { // a cache was updated
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

		if (this.cache instanceof Register && other.cache instanceof Register) {
			this.cache.mergeUpdates(other.cache, alwaysExecute);
		}
	}


	toLLVM(ref) {
		return new LLVM.Argument(
			this.type.toLLVM(this.declared),
			new LLVM.Name(this.id, false, this.declared),
			ref,
			this.name
		);
	}
}

module.exports = Register;