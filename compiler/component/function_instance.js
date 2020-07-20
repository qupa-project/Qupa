const { Generator_ID } = require('./generate.js');

const Flattern = require('./../parser/flattern.js');
const TypeDef = require('./typedef.js');
const LLVM = require('../middle/llvm.js');
const Scope = require('./scope.js');
const Execution = require('./execution.js');
const State = require('./state.js');


let funcIDGen = new Generator_ID();

class Function_Instance {
	constructor (ctx, ast, external = false, abstract = false) {
		this.ctx = ctx;
		this.ast = ast;
		this.ref = ast.ref.start;
		this.external = external;
		this.abstract = abstract;

		this.returnType = null;
		this.signature = [];
		this.calls = new Map();
		this.isInline = false;

		this.linked = false;

		this.id = funcIDGen.next();

		this.name = ast.tokens[0].tokens[1].tokens;
		this.represent = external ? `${this.name}` : `${this.name}.${this.ctx.getFileID().toString(36)}.${this.id.toString(36)}`;
	}

	markExport() {
		this.represent = this.name;
	}

	getFileID() {
		return this.ctx.getFileID();
	}

	getFile() {
		return this.ctx.getFile();
	}

	getFunction() {
		return this;
	}

	getType (dataType) {
		let file = this.getFile();
		return [
			dataType.tokens[0], 
			file.getType(Flattern.DataTypeList(dataType))
		];
	}

	/**
	 * Marks this function as being called from this function
	 * @param {Function_Instance} func 
	 * @param {State} state
	 * @returns {Boolean} whether this was a new call or not
	 */
	addCall(func, state = new State()) {
		let states = this.calls.get(func) || [];

		let found = false;
		for (let prev of states) {
			if (prev.match(state)) {
				found = true;
				break;
			}
		}

		if (!found) {
			states.push(state);
			this.calls.set(func, states);

			return true;
		}

		return false;
	}



	link () {
		if (this.linked) {
			return;
		}

		let file = this.ctx.ctx;
		let head = this.ast.tokens[0];
		let args = head.tokens[2].tokens;

		// Flaten signature types AST into a single array
		let types = [ head.tokens[0] ];
		if (args.length > 0) {
			types = types.concat(args.map((x) => {
				return x[0];
			}));
		}

		for (let type of types){
			let search = this.getType(type);
			if (search[1] instanceof TypeDef) {
				this.signature.push(search);
			} else {
				if (search[1] == null) {
					file.throw(
						`Invalid type name "${Flattern.DataTypeStr(type)}"`,
						type.ref.start, type.ref.end
					);
				} else {
					file.throw(
						`Unexpected data type form "${typeof(search[1])}"`,
						type.ref.start, type.ref.end
					);
				}
			}
		}

		this.returnType = this.signature.splice(0, 1)[0];
		this.linked = true;
	}



	match (other) {
		// Ensure both functions have linked their data types
		this.link();
		other.link();

		// Match the signatures
		return this.matchSignature(other);
	}
	matchSignature (sig) {
		this.link();
		
		if (this.signature.length != sig.length) {
			return false;
		}

		for (let i=0; i<sig.length; i++) {
			if (this.signature[i][0] != sig[i][0]) {
				return false;
			}
			let a = this.signature[i][1].represent || this.signature[i][1];
			let b = sig[i][1].represent || sig[i][1];
			if (a != b) {
				return false;
			}
		}

		return true;
	}
	


	compile() {
		if (this.abstract) {
			return null;
		}

		let generator = new Generator_ID(0);
		let head = this.ast.tokens[0];
		let argReg = [];
		let args = [];
		for (let i=0; i<this.signature.length; i++) {
			let regID = generator.next();
			argReg.push({
				id      : regID,
				type    : this.signature[i][1],                  // type
				pointer : this.signature[i][0],                  // pointerLvl
				name    : head.tokens[2].tokens[i][1].tokens,    // name
				ref     : head.tokens[2].tokens[i][0].ref.start  // ln ref
			});

			args.push(new LLVM.Argument(
				new LLVM.Type(
					this.signature[i][1].represent,
					this.signature[i][0],
					head.tokens[2].tokens[i][0].ref.start
				),
				new LLVM.Name(
					regID,
					false,
					head.tokens[2].tokens[i][1].ref.start
				),
				head.tokens[2].tokens[i][0].ref.start,
				head.tokens[2].tokens[i][1].tokens
			));
		}

		let frag = new LLVM.Procedure(
			new LLVM.Type(this.returnType[1].represent, this.returnType[0], head.tokens[0].ref),
			new LLVM.Name(this.represent, true, head.tokens[1].ref),
			args,
			"#1",
			this.external,
			this.ref
		);

		let scope = new Scope(
			this,
			this.getFile().project.config.caching,
			generator
		);
		let setup = scope.register_Args(argReg);
		if (setup !== null) {
			if (!this.abstract && !this.external) {
				frag.merge(setup);
				let exec = new Execution(this, this.returnType[1], scope);
				frag.merge(exec.compile(this.ast.tokens[1]));
			}
		}

		return frag;
	}
}

module.exports = Function_Instance;