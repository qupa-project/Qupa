const Flattern = require("../parser/flattern");

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
	toString() {
		return Flattern.DuplicateChar(this.pointer, "@")+this.type.name;
	}
}

module.exports = TypeRef;