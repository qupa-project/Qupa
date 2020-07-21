const Function_Instance = require('./function_instance.js');
const Template = require('../component/template.js');
const LLVM = require('../middle/llvm.js');

const types = require('./types.js');
const TypeRef = require('../component/typeRef.js');

class Template_Primative_Bitcast extends Template {
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

		// Must both NOT be a primative data type
		if (types[template.type.represent] || types[signature[0].type.represent]) {
			return false;
		}

		// They must both NOT be pointers
		if (template.pointer != 0 || signature[0].pointer != 0) {
			return false;
		}


		let func = new Function_Instance(this, "Bitcast", new TypeRef(0, variable[0][0]), signature);
		let mode = null;
		if (signature[0][1].cat == "int") {
			mode = signature[0][1].signed ? 0 : 1;
		} else if (signature[0][1].cat == "float") {
			mode = 2;
		}
		func.generate = (regs, ir_args) => {
			return {
				preamble: new LLVM.Fragment(),
				instruction: new LLVM.Extend(
					mode,
					ir_args[0],
					template.toLLVM(),
					null
				),
				type: template
			};
		};

		return func;
	}
}

module.exports = Template_Primative_Bitcast;