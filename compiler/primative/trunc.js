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
		let template = variable[0][0];

		// Must be a primative data type
		if (!types[template.type.represent] || !types[signature[0].type.represent]) {
			return false;
		}

		// They must both not be pointers
		if (template.pointer != 0 || signature[0].pointer != 0) {
			return false;
		}

		// Must both be either an int or a float
		if (
			(template.type.cat  != "int" && template.type.cat  != "uint" && template.type.cat  != "float") ||
			(signature[0].type.cat != "int" && signature[0].type.cat != "uint" && signature[0].type.cat != "float")
		) {
			return false;
		}

		// They must either both be int, both be uint, or both be float
		if (template.type.cat != signature[0].type.cat) {
			return false;
		}

		// The target size must be smaller
		if (template.type.size > signature[0].type.size) {
			return false;
		}


		let func = new Function_Instance(this, "Trunc", template, signature);
		func.generate = (regs, ir_args) => {
			return {
				preamble: new LLVM.Fragment(),
				instruction: new LLVM.Trunc(
					template.type.cat == float ? 1 : 0,
					template.toLLVM(),
					ir_args[0],
					null
				),
				type: template
			};
		};

		return func;
	}
}

module.exports = Template_Primative_Trunc;