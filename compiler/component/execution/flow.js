const LLVM     = require("../../middle/llvm.js");
const TypeRef  = require('../typeRef.js');
const ExecutionExpr = require('./expr.js');

const Primative = {
	types: require('../../primative/types.js')
};

class Execution extends ExecutionExpr {
	/**
	 *
	 * @param {BNF_Node} ast
	 * @returns {LLVM.Fragment}
	 */
	compile_if (ast) {
		let frag = new LLVM.Fragment(ast);

		// Check for elif clause
		if (ast.tokens[1].length > 0) {
			this.getFile().throw(
				`Error: Elif statements are currently unsupported`,
				ast.ref.start, ast.ref.end
			);
			return frag;
		}


		/**
		 * Prepare the condition value
		 */
		let cond = this.compile_expr(
			ast.tokens[0].tokens[0],
			new TypeRef(0, Primative.types.bool),
			true
		);
		if (cond.epilog.stmts.length > 0) {
			throw new Error("Cannot do an if-statement using instruction with epilog");
		}
		frag.merge(cond.preamble);


		/**
		 * Prepare condition true body
		 */
		let true_id = new LLVM.ID(ast.tokens[0].tokens[1].ref);
		let scope_true = this.clone();
		scope_true.entryPoint = true_id;
		let body_true = scope_true.compile(ast.tokens[0].tokens[1]);
		body_true.prepend(new LLVM.Label(
			true_id,
			ast.tokens[0].tokens[1].ref
		).toDefinition());
		body_true.merge(scope_true.flushAllClones());


		/**
		 * Prepare condition false body
		 */
		let hasElse = ast.tokens[2] !== null;
		let false_id = new LLVM.ID();
		let body_false = new LLVM.Fragment();
		let scope_false = this.clone();
		scope_false.entryPoint = false_id;
		if (hasElse) {
			body_false = scope_false.compile(ast.tokens[2].tokens[0]);
			body_false.prepend(new LLVM.Label(
				false_id
			).toDefinition());
			body_false.merge(scope_false.flushAllClones());
		}


		/**
		 * Cleanup and merging
		 */
		let endpoint_id = new LLVM.ID();
		let endpoint = new LLVM.Label(
			new LLVM.Name(endpoint_id.reference(), false)
		);


		// Push the branching jump
		frag.append(new LLVM.Branch(
			cond.instruction,
			new LLVM.Label(
				new LLVM.Name(true_id.reference(), false, ast.tokens[0].tokens[1].ref),
				ast.tokens[0].tokens[1].ref
			),
			new LLVM.Label(
				new LLVM.Name( hasElse ? false_id.reference() : endpoint_id.reference() , false)
			),
			ast.ref.start
		));



		// Prepare the synchronisation pre-process for each branch
		let sync = this.mergeUpdates([
			scope_true,
			hasElse ? scope_false : this
		]);
		body_true.merge  (sync.frags[0]);
		body_false.merge (sync.frags[1]);



		// Push the if branch
		if (!scope_true.returned) {
			body_true.append(new LLVM.Branch_Unco(endpoint));
		}
		frag.merge(body_true);

		// Push the else branch
		if (hasElse) {
			if (!scope_false.returned) {
				body_false.append(new LLVM.Branch_Unco(endpoint));
			}
			frag.merge(body_false);
		}

		// Both branches returned
		if (scope_true.returned && scope_false.returned) {
			this.returned = true;
		}

		// Push the end point
		if (!this.returned) {
			frag.append(new LLVM.Label(
				endpoint_id
			).toDefinition());
		}




		// Push the final clean up an synchronisation
		frag.merge(sync.sync);

		// Mark current branch
		this.entryPoint = hasElse ? false_id : endpoint_id;

		return frag;
	}


	/**
	 *
	 * @param {BNF_Node} ast
	 * @returns {LLVM.Fragment}
	 */
	compile_while (ast) {
		let frag = new LLVM.Fragment();

		let check_id = new LLVM.ID(ast.tokens[0].ref);
		let loop_id  = new LLVM.ID(ast.tokens[1].ref);
		let end_id   = new LLVM.ID();


		// Loop Entry
		let scope_check = this.clone();
		let check = scope_check.compile_while_condition(ast.tokens[0]);
		if (check === null) {
			return null;
		}
		check.instructions.append(new LLVM.Branch(
			check.register,
			new LLVM.Label(
				new LLVM.Name(loop_id.reference(), false, ast.tokens[0].tokens[0]),
				ast.tokens[0].tokens[0]
			),
			new LLVM.Label(
				new LLVM.Name(end_id.reference(), false, ast.tokens[0].tokens[0]),
				ast.tokens[0].tokens[0]
			),
			ast.ref.start
		));


		// Compute Loop
		let scope_loop = scope_check.clone();
		scope_loop.entryPoint = loop_id;
		let recurr = scope_loop.scope.prepareRecursion(this.entryPoint.reference());
		let loop = scope_loop.compile(ast.tokens[1]);
		if (loop === null) {
			return null;
		}

		// Add any preparation needed before entry to the loop
		check.instructions.merge(recurr.prolog);
		frag.merge(check.instructions);


		// Recursion check
		frag.append(new LLVM.Label(check_id, check_id.ref).toDefinition());
		scope_check = scope_loop.clone();
		scope_check.entryPoint = check_id;
		check = scope_check.compile_while_condition(ast.tokens[0]);
		if (check === null) {
			return null;
		}
		frag.merge(check.instructions);
		frag.append(new LLVM.Branch(
			check.register,
			new LLVM.Label(
				new LLVM.Name(loop_id.reference(), false, loop_id.ref),
				ast.tokens[0].tokens[0]
			),
			new LLVM.Label(
				new LLVM.Name(end_id.reference(), false, loop_id.ref),
				ast.tokens[0].tokens[0]
			),
			ast.ref.start
		));



		// Resolve loop values
		let recurr_resolve = scope_loop.scope.resolveRecursion(
			recurr.state,
			scope_check.entryPoint
		);
		loop.merge_front(recurr_resolve.prolog);
		loop.merge(recurr_resolve.epilog);



		// If any variables were updated within child scopes
		//   Flush their caches if needed
		scope_loop.entryPoint = scope_check.entryPoint;
		let sync = this.mergeUpdates([this, scope_loop]);
		frag.merge(sync.frags[0]);
		loop.merge(sync.frags[1]);


		// Insert loop instructions
		frag.append(new LLVM.Label(loop_id, loop_id.ref).toDefinition());
		frag.merge(loop);
		// Jump to the check
		frag.append(new LLVM.Branch_Unco(new LLVM.Label(
			new LLVM.Name(check_id.reference(), false, ast.tokens[0].ref),
			ast.tokens[0].tokens[0]
		)));


		// End point
		frag.append(new LLVM.Label(end_id, end_id.ref).toDefinition());

		this.entryPoint = end_id;
		frag.merge(sync.sync);

		return frag;
	}
	/**
	 *
	 * @param {BNF_Node} ast
	 * @param {Object}
	 */
	compile_while_condition(ast) {
		let res = this.compile_expr(
			ast,
			new TypeRef(0, Primative.types.bool),
			true
		);

		if (res === null) {
			return null;
		}

		res.preamble.merge(res.epilog);
		return {
			instructions: res.preamble,
			register: res.instruction
		};
	}
}

module.exports = Execution;
