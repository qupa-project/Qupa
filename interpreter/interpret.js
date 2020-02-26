const MappedString = require('./lib/mappedString.js');
const Patternize = require('./parser/patternize.js');
const Tokenizer = require('./lexer/tokenizer.js');
const fs = require('fs');



function Ingest (file) {
	file = new MappedString(file, './example.qp');
	let tokens = Tokenizer(file);
	let patterns = Patternize(tokens);

	if (patterns === null) {
		console.error(" ");
		console.error("Unable to compile code due to interpretation errors");
		process.exit(1);
	}


	let output = {
		functions: [],
		classes: [],
		globals: [],
		imports: [],
		exports: [],
	}

	for (let element of patterns) {
		switch (element.pattern.name) {
			case "function":
				output.functions.push({
					type: element.pattern.name, tokens: element.tokens
				});
				break;
			case "import.direct":
			case "import.as":
				output.imports.push({
					type: element.pattern.name, tokens: element.tokens
				});
				break;
			case "declare":
				output.globals.push({
					type: element.pattern.name, tokens: element.tokens
				});
				break;
			case "expose":
				output.exports.push({
					exports: element.pattern.name, tokens: element.tokens
				});
				break;
			default:
				console.error(`Internal Error: Unexpected global pattern ${element.pattern.name}`);
				process.exit(1);
				break;
		}
	}

	return output;
}

let out = Ingest(fs.readFileSync('./example.qp', 'utf8'));
console.log(out);

// fs.writeFileSync('out-patterns.json', JSON.stringify(patterns, null, 2));

