const Function_Instance = require('./function_instance.js');
const Template = require('../component/template.js');
const LLVM = require('../middle/llvm.js');

const types = require('./types.js');
const { float } = require('./types.js');
const TypeRef = require('../component/typeRef.js');

class Template_Primative_Trunc extends Template {
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
		// Must be a primative data type
		if (!types[variable[0][0].represent] || !types[signature[0][1].represent]) {
			return false;
		}
		// Must both be either an int or a float
		if (
			(variable[0][0].cat  != "int" && variable[0][0].cat  != "uint" && variable[0][0].cat  != "float") ||
			(signature[0][1].cat != "int" && signature[0][1].cat != "uint" && signature[0][1].cat != "float")
		) {
			return false;
		}
		// They must either both be int, both be uint, or both be float
		if (variable[0][0].cat != signature[0][1].cat) {
			return false;
		}
		// The target size must be smaller
		if (variable[0][0].size > signature[0][1].size) {
			return false;
		}


		let func = new Function_Instance(this, "Trunc", new TypeRef(0,variable[0][0]), signature);
		func.generate = (regs, ir_args) => {
			return {
				preamble: new LLVM.Fragment(),
				instruction: new LLVM.Trunc(
					variable[0][0].cat == float ? 1 : 0,
					new LLVM.Type(variable[0][0].represent, 0, null),
					ir_args[0],
					null
				),
				type: [ 0, variable[0][0] ]
			};
		};

		return func;
	}
}

module.exports = Template_Primative_Trunc;