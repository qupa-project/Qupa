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
		// let err = new Error('Using depricated name');
		// console.info(err);
		return this.id;
	}

	markUpdated(ref) {
		let frag = new LLVM.Fragment();

		if (this.cache) {
			frag.merge(this.cache.markUpdated());

			frag.append(new LLVM.Store(
				new LLVM.Type(this.type.represent, this.pointer-1),
				new LLVM.Name(this.id, false),
				new LLVM.Argument(
					new LLVM.Type(this.type.represent, this.pointer-1),
					new LLVM.Name(this.cache.id, false)
				),
				this.type.size,
				ref
			));
		}
		this.cache = null;

		return frag;
	}
}

module.exports = Register;