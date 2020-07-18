const Function_Instance = require('./function_instance.js');
const Template = require('../component/template.js');
const LLVM = require('../middle/llvm.js');

const types = require('./types.js');

class Template_Primative_Extend extends Template {
	constructor(ctx) {
		super(ctx, null);
	}

	getFile () {
		return this.ctx.getFile();
	}

	getFunction(variable, signature) {
		if (!Array.isArray(variable[0])) {
			return false;
		}
		if (variable[0].length != 1) {
			return false;
		}
		if (!types[variable[0][0].represent] || !types[signature[0][1].represent]) {
			return false;
		}


		let func = new Function_Instance(this, "Extend", variable[0][0], signature);
		let mode = null;
		if (signature[0][1].cat == "int") {
			mode = signature[0][1].signed ? 0 : 1;
		} else if (signature[0][1].cat == "float") {
			mode = 2;
		}
		func.generate = (regs, ir_args) => {
			console.log(36, variable[0][0].represent, ir_args[0]);

			return {
				preamble: new LLVM.Fragment(),
				instruction: new LLVM.Extend(
					mode,
					new LLVM.Type(variable[0][0].represent, 0, null),
					ir_args[0],
					null
				),
				returnType: variable[0][0]
			};
		};

		return func;
	}
}

module.exports = Template_Primative_Extend;