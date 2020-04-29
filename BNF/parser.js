const fs = require('fs');
let data = fs.readFileSync('./bnf-next.bnf', 'utf8');

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


let tree = JSON.parse(fs.readFileSync('./bnf.json', 'utf8'));
function Process (input, tree, term, stack = [], level = 0) {
	let branch = tree.terms[term];

	if (stack.indexOf(term) != -1) {
		return new SyntaxError(new Reference(0,0), input);
	}
	stack.push(term);

	console.log(20, level, stack);

	if (branch === undefined) {
		throw new Error(`Invalid tree term "${term}"`);
	}

	if (branch.type == "select") {
		console.log('SEL');

		for (let target of branch.match) {
			if (target.type == "literal") {
				if (input.slice(0, target.val.length) == target.val) {
					console.log(' ', "FIN", term);
					return new SyntaxNode ([term], target.val, target.val.length);
				}
			} else if (target.type == "ref") {
				let res = Process(input, tree, target.val, [...stack], level+1);
				if (res instanceof SyntaxNode) {
					console.log(' ', "FIN", term);
					return new SyntaxNode(term, [res], res.consumed);
				}
			} else {
				throw new Error(`Malformed tree: Invalid match type ${target.type}`);
			}
		}

		console.log('  FAIL', term);
		return new SyntaxError(new Reference(0,0), input);
	} else if (branch.type == "sequence") {
		let out = [];

		console.log('SEQ');
		for (let target of branch.match) {
			if (!target.count) {target.count = "1";}

			console.log(65, target, input);

			let atMostOnce = target.count == "1" || target.count == "?";
			let optional   = target.count == "?" || target.count == "*";
			let moreOnce   = target.count == "+" || target.count == "*";
			let first = true;
			let res = true;
			let sub = [];

			while ( 
				!(res instanceof SyntaxError) &&
				input.length > 0              &&
				( (atMostOnce && first) || moreOnce )
			){
				first = false;
				if (target.type == "literal") {
					if (input.slice(0, target.val.length) == target.val) {
						res = new SyntaxNode("literal", target.val, target.val.length);
					} else {
						res = false;
					}
				} else if (target.type == "ref") {
					res = Process(input, tree, target.val, [...stack], level+1);
				} else {
					throw new Error(`Malformed tree: Invalid selector match type ${target.type}`);
				}


				if (res instanceof SyntaxNode) {
					if (res.consumed == 0 ){
						console.log("CONSUMED NOTHING!!!", sub, term, target);
						break;
					}

					input = input.slice(res.consumed);
					stack = [];
					sub.push(res);
				}
			}

			console.log(112, term, atMostOnce, optional, moreOnce, sub);

			if (optional) {
				out.push(sub);
				continue;
			} else if (moreOnce && sub.length >= 1) {
				out.push(sub);
				continue;
			} else if (atMostOnce && sub.length <= 1) {

				if (!optional && sub.length == 0) {
					console.log(126,'  FAIL', term, sub, target, out);
					return new SyntaxError(new Reference(0,0),input);
				} else {
					out.push(sub);
					continue;
				}

			}
			console.log(133,'  FAIL', term, sub, target, out);
			return new SyntaxError(new Reference(0,0),input);
		}

		let consumed = out.reduce( (prev = 0, curr) => {
			return prev.concat(curr);
		});
		if (consumed.length == 0) {
			consumed = 0;
		} else if (consumed.length == 1) {
			consumed = consumed[0].consumed;
		} else {
			consumed = consumed.reduce((prev, curr) => {
				return ( isNaN(prev) ? prev.consumed : prev ) + curr.consumed;
			});
		}

		return new SyntaxNode(term, out, consumed);
	} else if (branch.type == "not") {
		let ran = false;
		let res = false;
		let out = "";
		while (res === false) {
			if (input.length == 0) {
				return new SyntaxError(new Reference(0,0), input);
			}

			res = Process(input, tree, branch.match, [...stack], level+1);

			if (res instanceof SyntaxError) {
				ran = true;
				out += input[0];
				input = input.slice(1);
				stack = [];
			}
		}

		if (ran instanceof SyntaxNode) {
			return new SyntaxNode(term, out, out.length);
		} else {
			console.log('  FAIL', term);
			return new SyntaxError(new Reference(0,0), input);
		}
	} else {
		throw new Error(`Malformed tree: Invalid term type ${branch.type}`);
	}
}


data = `<a> `;
let res = Process(data, tree, "#t1");
console.log('END', data.length, res);
console.log(data.length == res.consumed ? "Success" : "Partcial completion");
fs.writeFileSync('temp.json', JSON.stringify(res, null, 2));

console.log('REMAINING', data.slice(res.consumed));