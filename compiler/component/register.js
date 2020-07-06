const LLVM = require('./../middle/llvm.js');

class Register {
	constructor(id, type, name, pointerDepth, ref) {
		this.id       = id;
		this.type     = type;
		this.name     = name;
		this.pointer  = pointerDepth;
		this.declared = ref;
		this.cache    = null;
	}

	get register(){
		console.warn(new Error('Using depricated name'));
		return this.id;
	}

	markUpdated(ref) {
		return this.clearCache(ref);
	}

	/**
	 * Forces caches to write data to the correct location
	 * @param {BNF_Reference} ref 
	 */
	flushCache(ref) {
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
		this.cache = null;

		return frag;
	}

	/**
	 * Dumps all caches, forcing reloads
	 */
	clearCache() {
		if (this.cache) {
			this.cache.clearCache();
		}
		this.cache = null;
	}
}

module.exports = Register;