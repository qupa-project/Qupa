const { Generator_ID } = require('./generate.js');

const Flattern = require('./../parser/flattern.js');
const TypeDef = require('./typedef.js');
const LLVM = require('../middle/llvm.js');
const Scope = require('./scope.js');
const Execution = require('./execution.js');
const State = require('./state.js');
const TypeRef = require('./typeRef.js');


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
		return this.getFile().getType(Flattern.DataTypeList(dataType));
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
			search.pointer = type.tokens[0]; // Copy the pointer level across
			if (search instanceof TypeRef) {
				this.signature.push(search);
			} else {
				file.throw(
					`Invalid type name "${Flattern.DataTypeStr(type)}"`,
					type.ref.start, type.ref.end
				);
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
			if (!this.signature[i].match(sig[i])) {
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
		let argRegs = [];
		let irArgs = [];
		for (let i=0; i<this.signature.length; i++) {
			let regID = generator.next();
			argRegs.push({
				id      : regID,
				type    : this.signature[i].type,                // type
				pointer : this.signature[i].pointer,             // pointerLvl
				name    : head.tokens[2].tokens[i][1].tokens,    // name
				ref     : head.tokens[2].tokens[i][0].ref.start  // ln ref
			});

			irArgs.push(new LLVM.Argument(
				new LLVM.Type(
					this.signature[i].type.represent,
					this.signature[i].pointer,
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
			new LLVM.Type(this.returnType.type.represent, this.returnType.pointer, head.tokens[0].ref),
			new LLVM.Name(this.represent, true, head.tokens[1].ref),
			irArgs,
			"#1",
			this.external,
			this.ref
		);

		let scope = new Scope(
			this,
			this.getFile().project.config.caching,
			generator
		);
		let setup = scope.register_Args(argRegs);
		if (setup !== null) {
			if (!this.abstract && !this.external) {
				frag.merge(setup);
				let exec = new Execution(this, this.returnType, scope);
				frag.merge(exec.compile(this.ast.tokens[1]));
			}
		}

		return frag;
	}
}

module.exports = Function_Instance;