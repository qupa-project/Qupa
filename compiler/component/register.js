const LLVM = require('./../middle/llvm.js');

class Register {
	constructor(id, type, name, pointerDepth, ref) {
		this.id       = id;
		this.type     = type;
		this.name     = name;
		this.pointer  = pointerDepth;
		this.declared = ref;
		this.cache    = null;
		this.isClone  = false;
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
		this.cache = null;
	}

	deref(scope, read = true, amount = 1) {
		// Cannot dereference a value
		// Handle error within caller
		if (this.pointer == 0) {
			return null;
		}

		if (!read) {

		}
		let out = {
			preamble: new LLVM.Fragment(),
			register: this.cache
		};

		// If a new cache needs to be generated because:
		//  a) something needs to be written and LLVM registers are constant value
		//  b) the value of this reference has not yet been cached
		if (!read || this.cache === null) {
			this.cache = new Register(
				scope.generator.next(),
				this.type,
				this.name,
				this.pointer-1
			);
			out.register = this.cache;

			// If the value is going to be read, loads in the cache value
			// Otherwise leave the assigned register unused
			if (read) {
				out.preamble.append(new LLVM.Load(
					new LLVM.Name(`${this.cache.id}`, false),
					new LLVM.Type(this.type.represent, this.pointer-1),
					new LLVM.Name(`${this.id}`, false),
					this.type.size
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