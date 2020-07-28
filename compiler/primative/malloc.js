const Function_Instance = require('./function_instance.js');
const Template = require('../component/template.js');
const LLVM = require('../middle/llvm.js');

const types = require('./types.js');
const TypeRef = require('../component/typeRef.js');

class Template_Primative_Size_Of extends Template {
	constructor(ctx) {
		super(ctx, null);
	}

	getFunction(access, signature, template) {
		return this.generate(access, signature, template);
	}

	generate(access, signature, template) {
		if (access.length != 0) {
			return false;
		}

		if (signature.length != 1) {
			return false;
		}

		if (template.length != 0) {
			return false;
		}

		console.log(34, signature);

		let func = new Function_Instance(this, "Malloc", types.i32.toLLVM(), []);
		func.generate = (regs, ir_args) => {
			return {
				preamble: new LLVM.Fragment(),
				instruction: new LLVM.Call(
					types.i8.toLLVM(),
					new LLVM.Name("malloc", true, null),
					ir_args,
					null
				),
				type: new TypeRef(1, types.i8)
			};
		};

		return func;
	}
}

module.exports = Template_Primative_Size_Of;