const Instruction = require("./instruction.js");

class ID extends Instruction {
	constructor (ref) {
		super(ref);
		this.id = null;
		this.origin = true;
		this.link = null;
	}

	/**
	 * Returns a reference to the ID number
	 * @returns {ID}
	 */
	reference() {
		let out = new ID(this.ref);
		out.origin = false;
		out.link = this;
	}

	/**
	 * Returns the ID number
	*/
	getID () {
		return this.origin ? this.id : this.link.getID();
	}

	/**
	 * Assigns the ID number to this ID element
	 * @param {Generator_ID} gen the generator used to assign ID numbers
	 */
	assign_ID(gen) {
		if (this.origin) {
			this.id = gen.next();
		} else {
			this.ref.assignID(gen);
		}
	}

	/**
	 * Flattern the LLVM to a single string

	 * @returns {String}
	 */
	flattern() {
		let id = this.getID();
		return (id === null ? "err" : id).toString();
	}
}

module.exports = ID;