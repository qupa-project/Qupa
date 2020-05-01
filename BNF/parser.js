const fs = require('fs');
let data = fs.readFileSync('./bnf.bnf', 'utf8');

let expressions = {
	declareStmt: new RegExp(/^<([A-z0-9_]+)> +::= (.+)(\n|$)/imu),
	dclrSplit: new RegExp(/^\s*\| /mu)
}


class Reference {
	constructor(line, col) {
		this.line = line;
		this.col = col
	}
};

class SyntaxError {
	constructor(ref, remaining){
		this.ref = ref;
		this.remaining = remaining;
	}
}
class SyntaxNode {
	constructor(type, tokens, consumed) {
		this.type     = type;
		this.tokens   = tokens;
		this.consumed = consumed;
	}
}


function Process_Select   (input, tree, branch, stack = [], level = 0){
	for (let target of branch.match) {
		if (target.type == "literal") {
			if (input.slice(0, target.val.length) == target.val) {
				return new SyntaxNode ([branch.term], target.val, target.val.length);
			}
		} else if (target.type == "ref") {
			let res = Process(input, tree, target.val, [...stack], level+1);
			if (res instanceof SyntaxNode) {
				return new SyntaxNode(branch.term, [res], res.consumed);
			}
		} else {
			throw new Error(`Malformed tree: Invalid match type ${target.type}`);
		}
	}


	return new SyntaxError(new Reference(0,0), input);
}
function Process_Sequence(input, tree, branch, stack = [], level = 0) {
	let out = [];

	console.log('SEQ');
	for (let target of branch.match) {
		if (!target.count) { target.count = "1"; } // lazy load

		console.log(65, branch.term, target, input);

		let atMostOnce = target.count == "1" || target.count == "?";
		let optional = target.count == "?" || target.count == "*";
		let moreOnce = target.count == "+" || target.count == "*";
		let first = true;
		let res = true;
		let sub = [];

		while (
			!(res instanceof SyntaxError) &&
			((atMostOnce && first) || moreOnce)
		) {
			first = false;
			if (target.type == "literal") {
				if (input.slice(0, target.val.length) == target.val) {
					res = new SyntaxNode("literal", target.val, target.val.length);
				} else {
					res = false;
				}
			} else if (target.type == "ref") {
				res = Process(input, tree, target.val, [...stack], level + 1);
			} else {
				throw new Error(`Malformed tree: Invalid selector match type ${target.type}`);
			}


			if (res instanceof SyntaxNode) {
				input = input.slice(res.consumed);
				stack = [];
				sub.push(res);

				// MUST BE AFTER PUSH
				// Optional values can return nothing once,
				// Because if they never return anything the optional will not be valid.
				if (res.consumed == 0) {
					break;
				}
			}
		}

		console.log(112, branch.term, atMostOnce, optional, moreOnce);
		console.log(' ', out, sub);

		if (optional) {
			out.push(sub);
			continue;
		} else if (moreOnce && sub.length >= 1) {
			out.push(sub);
			continue;
		} else if (atMostOnce && sub.length <= 1) {

			if (!optional && sub.length == 0) {
				console.log(126, '  FAIL', branch.term, sub, target, out);
				return new SyntaxError(new Reference(0, 0), input);
			} else {
				out.push(sub);
				continue;
			}

		}
		console.log(133, '  FAIL', branch.term, sub, target, out);
		return new SyntaxError(new Reference(0, 0), input);
	}

	let consumed = out.reduce((prev = 0, curr) => {
		return prev.concat(curr);
	});
	if (consumed.length == 0) {
		consumed = 0;
	} else if (consumed.length == 1) {
		consumed = consumed[0].consumed;
	} else {
		consumed = consumed.reduce((prev, curr) => {
			return (isNaN(prev) ? prev.consumed : prev) + curr.consumed;
		});
	}

	console.log(148, 'END', branch.term);
	return new SyntaxNode(branch.term, out, consumed);
}
function Process_Not(input, tree, branch, stack = [], level = 0) {
	let ran = false;
	let res = false;
	let out = "";
	while (res === false) {
		if (input.length == 0) {
			return new SyntaxError(new Reference(0, 0), input);
		}

		res = Process(input, tree, branch.match, [...stack], level + 1);

		if (res instanceof SyntaxError) {
			ran = true;
			out += input[0];
			input = input.slice(1);
			stack = [];
		}
	}

	if (ran instanceof SyntaxNode) {
		return new SyntaxNode(branch.term, out, out.length);
	} else {
		console.log('  FAIL', branch.term);
		return new SyntaxError(new Reference(0, 0), input);
	}
}


let tree = JSON.parse(fs.readFileSync('./bnf.json', 'utf8'));
function Process (input, tree, term, stack = [], level = 0) {
	let branch = tree.terms[term];
	branch.term = term;

	if (stack.indexOf(term) != -1) {
		return new SyntaxError(new Reference(0,0), input);
	}
	stack.push(term);

	console.log(20, level, stack);

	if (branch === undefined) {
		throw new Error(`Invalid tree term "${term}"`);
	}

	if (branch.type == "select") {
		return Process_Select(input, tree, branch, stack, level);
	} else if (branch.type == "sequence") {
		return Process_Sequence(input, tree, branch, stack, level);
	} else if (branch.type == "not") {
		return Process_Not(input, tree, branch, stack, level);
	} else {
		throw new Error(`Malformed tree: Invalid term type ${branch.type}`);
	}

	throw new Error("Unknown run time error");
}


// data = `<program> ::= <stmt>+
// <stmt> ::= ( <a> | <b> )`;
data = `<a> | <b>`;
let res = Process(data, tree, "expr_p2");
console.log('END', data.length, res);
console.log(data.length == res.consumed ? "Success" : "Partcial completion");
fs.writeFileSync('temp.json', JSON.stringify(res, null, 2));

console.log('REMAINING', data.slice(res.consumed));