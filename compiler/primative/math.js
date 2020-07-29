const Function_Instance = require('./function_instance.js');
const Template = require('../component/template.js');
const LLVM = require('../middle/llvm.js');

const types = require('./types.js');
const TypeRef = require('../component/typeRef.js');

class Template_Primative_Math extends Template {
	constructor(ctx, type) {
		super(ctx, null);
		this.type = type;
	}

	getFunction(variable, signature) {
		if (variable.length != 0) {
			return false;
		}

		// Add takes two variables
		if (signature.length != 2) {
			return false;
		}

		for (let i=0; i<signature.length; i++) {
			// must be non-pointer
			if (signature[i].pointer != 0) {
				return false;
			}

			// Get related primative
			signature[i].type = types[signature[i].type.represent];
			if (signature[i] === undefined) {
				return false;
			}
		}

		// Both opperands must be of the same type
		if (signature[0].type != signature[1].type) {
			return false;
		}

		let func = new Function_Instance(this, this.type, new TypeRef(0, signature[0]), signature);
		let mode = null;
		if (signature[0].type.cat == "int") {
			mode = signature[0].type.signed ? 0 : 1;
		} else if (signature[0].type.cat == "float") {
			mode = 2;
		}
		if (mode === null) {
			return false;
		}

		let action = this.type;
		func.generate = (regs, ir_args) => {
			return {
				preamble: new LLVM.Fragment(),
				instruction: new LLVM[action](mode, ir_args[0].type, ir_args[0].name, ir_args[1].name),
				type: new TypeRef(0, types[ir_args[0].type.term])
			};
		};
		return func;
	}
}

module.exports = Template_Primative_Math;