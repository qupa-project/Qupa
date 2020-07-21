const Flattern = require("../parser/flattern");
const LLVM = {
	Type: require('./../middle/type.js')
};

class TypeRef {
	/**
	 *
	 * @param {Number} pointerLvl
	 * @param {Type} type
	 */
	constructor(pointerLvl, type) {
		this.pointer = pointerLvl;
		this.type = type;
	}

	/**
	 *
	 * @param {TypeRef} other
	 */
	match (other) {
		if (!(other instanceof TypeRef)) {
			return false;
		}

		return this.pointer == other.pointer && this.type == other.type;
	}

	/**
	 * @returns {String}
	 */
	toString () {
		return Flattern.DuplicateChar(this.pointer, "@")+this.type.name;
	}

	toLLVM (ref = null) {
		return new LLVM.Type(this.type.represent, this.pointer, ref);
	}
}

module.exports = TypeRef;