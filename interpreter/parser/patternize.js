const grammer = require('./grammer.js');


function MatchElementName (value, target){
	return value.slice(0, target.length) == target;
}


class Pattern {
	constructor (name, tokens, reference) {
		this.name = name;
		this.data = tokens;
		this.reference = reference;
	}
}

function CollapseNameSpaces(tokens) {
	let merge = [
		["token", "token.delimiter.variable"],
		["token.delimiter.variable", "token"],
		["token", "bracket.square"],
		["bracket.square", "bracket.square"],
		["bracket.square", "token.delimiter.variable"]
	];

	for (let i=0; i<tokens.length-1; i++) {
		let continuation = false;
		let matched = false;
		let target = null;

		// Select target
		if (tokens[i].name == "namespace"){
			target = tokens[i].data[tokens[i].data.length - 1];
			continuation = true;
		} else {
			target = tokens[i];
		}

		for (let tuple of merge) {
			if (tuple[0] == target.name &&
					tuple[1] == tokens[i+1].name
			) {
				matched = true;
			}
		}

		// If this is a collapsable element
		if (matched) {
			if (continuation) {  // Expand existing name space
				tokens[i].data.push( tokens.splice(i+1, 1)[0] );
			} else {             // Create new namespace
				tokens[i] = new Pattern(
					'namespace',
					[
						target,
						tokens.splice(i+1, 1)[0]
					],
					tokens[i].reference
				);
			}

			i--;
		} else if (!continuation && tokens[i].name == "token") {
			tokens[i] = new Pattern(
				'namespace',
				[ tokens[i] ],
				tokens[i].reference
			);
			i--;
		}
	}

	return tokens;
}


function Process(tokens, scope = grammer) {
	tokens = CollapseNameSpaces(tokens);

	function GetMatch (index) {
		outer: for (let opt of scope.patterns) {
			let consumed = 0;

			// Check if the current point completely matches the pattern
			for (let i=0; i<opt.tokens.length; i++) {
				if (MatchElementName(tokens[index+i].name, opt.tokens[i])) {
					consumed++;
				} else {
					continue outer;
				}
			}

			// If so
			return {consumes: consumed, pattern: opt};
		}

		return null;
	}

	for (let i=0; i<tokens.length;) {
		let match = GetMatch(i);
		if (match) {
			i += match.consumes;
		} else {
			console.error(`Error: Unexpected ${tokens[i].name}`);
			console.error(`         at ${tokens[i].reference.toString()}`);
			return null;
		}
	}

	// for (let element of tokens) {
	// 	if (element instanceof Pattern) {
	// 		console.log(68, element);
	// 	}
	// }

	return tokens;
}


module.exports = Process;