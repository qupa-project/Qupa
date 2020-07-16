const Function_Instance = require('./function_instance.js');
const Template = require('../component/template.js');
const LLVM = require('../middle/llvm.js');

const types = require('./types.js');

class Template_Primative_Math extends Template {
	constructor(ctx, type) {
		super(ctx, null);
		this.type = type;
	}

	getFile () {
		return this.ctx.getFile();
	}

	getFunction(variable, signature) {
		// Add takes two variables
		if (signature.length != 2) {
			return false;
		}

		for (let i=0; i<signature.length; i++) {
			// must be non-pointer
			if (signature[i][0] != 0) {
				return false;
			}

			// Get related primative
			signature[i][1] = types[signature[i][1]];
			if (signature[i][1] === undefined) {
				return false;
			}
		}

		if (signature[0][1] != signature[1][1]) {
			return false;
		}

		let func = new Function_Instance(this, this.type, signature[0], signature);
		let mode = null;
		if (signature[0][1].cat == "int") {
			mode = signature[0][1].signed ? 0 : 1;
		} else if (signature[0][1].cat == "float") {
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
				returnType: types[ir_args[0].type.term]
			};
		};
		return func;
	}
}

module.exports = Template_Primative_Math;