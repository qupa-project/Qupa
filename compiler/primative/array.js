const Function_Instance = require('./function_instance.js');
const Template = require('../component/template.js');
const LLVM = require('../middle/llvm.js');
const TypeRef = require('../component/typeRef.js');
const TypeDef = require('../component/typeDef.js');
const { Struct } = require('../middle/llvm.js');

class Template_Array extends Template {
	constructor(ctx) {
		super(ctx, null);
		this.name = "Array";
		this.instances = {};
	}

	getFile () {
		return this.ctx.getFile();
	}

	getType (typeList, template) {
		if (typeList.length != 0) {
			return null;
		}

		// Check the two template arguments are correct
		if (!(template[0] instanceof TypeRef)) {
			return null;
		}
		if (template[1] instanceof TypeRef) {
			return null;
		}

		if (template[1].instruction.type.term != "i32") {
			return null;
		}

		let size = Number(template[1].instruction.name.val);
		let signature = `${template[0].type.represent} x ${size}`;

		let inst = this.instances[signature];
		if (inst === undefined) {
			inst = new Array_Gen(this, template[0], size);
			inst.link();

			this.instances[signature] = inst;
		}

		return new TypeRef(0, inst);
	}

	getFunction(variable, signature) {
		return null;
	}
}

class Array_Gen extends TypeDef {
	/**
	 *
	 * @param {File} ctx
	 * @param {TypeRef} type
	 * @param {Number} length
	 */
	constructor(ctx, type, length = 0) {
		super(ctx, {
			ref: {start: null, end: null}
		}, false);

		this.represent = `[${length} x ${type.type.represent}]`;
		this.length  = length;
		this.typeRef = type;
		this.size = 0;
	}

	parse () {
		// override existing
	}

	link () {
		this.size = this.typeRef.pointer != 0 ? 4 : this.typeRef.type.size * this.length;
	}
}

module.exports = Template_Array;