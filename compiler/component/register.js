const LLVM = require('./../middle/llvm.js');

class Register_Base {
	constructor(type, name, pointerDepth, ref) {
		this.type     = type;
		this.name     = name;
		this.pointer  = pointerDepth;
		this.declared = ref;
		this.cache    = null;
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
					new LLVM.Name(this.id, false),
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
}

class Register_Hollow extends Register_Base {
	constructor(type, name, pointerDepth, ref) {
		super(type, name, pointerDepth, ref);
	}

	get id(){
		throw new Error("Cannot get ID of hollow register");
	}
}

class Register extends Register_Base {
	constructor(id, type, name, pointerDepth, ref) {
		super(type, name, pointerDepth, ref);
		this.id       = id;
	}

	static Hollow = Register_Hollow;
}

module.exports = Register;