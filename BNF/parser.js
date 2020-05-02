const fs = require('fs');
let data = fs.readFileSync('./bnf.bnf', 'utf8');

let expressions = {
	declareStmt: new RegExp(/^<([A-z0-9_]+)> +::= (.+)(\n|$)/imu),
	dclrSplit: new RegExp(/^\s*\| /mu)
}


class Reference {
	constructor(line, col, internal) {
		this.line = line;
		this.col = col
		this.internal = internal;
	}
};

class SyntaxError {
	constructor(ref, remaining, branch){
		this.ref = ref;
		this.remaining = remaining;
		this.branch = branch;
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


	return new SyntaxError(new Reference(0,0), input, branch);
}
function Process_Sequence(input, tree, branch, stack = [], level = 0) {

	function MatchOne(target, string) {
		if (target.type == "literal") {
			if (string.slice(0, target.val.length) == target.val) {
				return new SyntaxNode("literal", [target.val], target.val.length);
			} else {
				return new SyntaxError(new Reference(0, 0), string, branch);
			}
		} else if (target.type == "ref") {
			return Process(string, tree, target.val, [...stack], level + 1);
		}

		throw new Error(`Malformed tree: Invalid selector match type ${target.type}`);
	}

	function MatchZeroToMany(target, string) {
		let sub = [];
		let res;

		while (!(res instanceof SyntaxError)) {
			res = MatchOne(target, string);

			if (res instanceof SyntaxNode) {
				string = string.slice(res.consumed);
				sub.push(res);

				// Stop consuming 0 tokens infinitly
				// But at least consume it once as it is a valid parse for ==1 >=1
				if (res.consumed == 0) {
					break;
				}
			}
		}

		return sub;
	}


	let consumed = 0;
	let out = [];
	for (let target of branch.match) {
		if (!target.count) { target.count = "1"; } // lazy load

		let sub = [];

		// Match tokens
		if (target.count == "?" || target.count == "1") {
			let res = MatchOne(target, input);
			if (res instanceof SyntaxNode) {
				sub = [res];
			} else {
				sub = [];
			}
		} else if (target.count == "*" || target.count == "+") {
			sub = MatchZeroToMany(target, input);
		}

		// Check number of tokens
		if (sub.length == 0 && ( target.count == "+" || target.count == "1" )) {
			return new SyntaxError(new Reference(0, 0), input, {...branch, stage: target,});
		}

		// Shift the search point forwards to not search consumed tokens
		let shift = 0;
		if (sub.length > 0) {
			shift = sub.reduce((prev, curr) => {
				return ( prev instanceof SyntaxNode ? prev.consumed : prev ) + curr.consumed;
			});
			if (shift instanceof SyntaxNode) {
				shift = shift.consumed;
			}
		}
		input = input.slice(shift);
		consumed += shift;

		out.push(sub);
	}

	return new SyntaxNode(branch.term, out, consumed);
}
function Process_Not(input, tree, branch, stack = [], level = 0) {
	let ran = false;
	let res = false;
	let out = "";
	while (res === false) {
		if (input.length == 0) {
			return new SyntaxError(new Reference(0, 0), input, branch);
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
		return new SyntaxError(new Reference(0, 0), input, branch);
	}
}


let tree = JSON.parse(fs.readFileSync('./bnf.json', 'utf8'));
function Process (input, tree, term, stack = [], level = 0) {
	let branch = tree.terms[term];
	if (!branch) {
		throw new Error(`Malformed Tree: Unknown branch name ${term} of tree`);
	}

	branch.term = term;

	// Infinite loop detection
	// Is if the execution order from this call to the previous has been repeated directly before
	let temp = stack.reverse(); // Check from the latest backwards
	let i = temp.indexOf(term);
	if (i != -1) {
		i++;
		let j = temp.slice(i).indexOf(term);
		if (j !== -1) {
			j += i+1;

			if (temp.slice(i, j), temp.slice(i+j, j+j)) {
				return new SyntaxError(new Reference(0,0), input, branch);
			}
		}
	}
	stack.push(term);

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


data = `( <def> | <comment> )+`;
let res = Process(data, tree, "expr_p2");
console.log('END', data.length, res);
console.log(data.length == res.consumed ? "Success" : "Partcial completion");
fs.writeFileSync('temp.json', JSON.stringify(res, null, 2));

console.log('REMAINING', data.slice(res.consumed));