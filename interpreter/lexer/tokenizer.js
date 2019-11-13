const fs = require('fs');
const SYNTAX = JSON.parse(fs.readFileSync(__dirname+'/tokens.json', 'utf8'));


const CodeReference = require('../lib/codeReference.js');


class Token {
	/**
	 * 
	 * @param {String} name 
	 * @param {MappedString} string 
	 */
	constructor(name, data, reference){
		this.name = name;
		this.data = data;
		this.reference = reference
	}
}



/**
 * 
 * @param {MappedString} string 
 */
function Ingest(string){
	let out = [];
	let lastI = 0;

	let i=0;
	for (; i<string.length; i++){
		let matched   = false;
		let usedChars = 1;
		let result = null;

		// Ignore whitespace
		if (!matched) {
			inner: for (let char of SYNTAX.whitespace) {
				if (string.getChar(i) == char) {
					usedChars = char.length;
					matched = true;
					break inner;
				}
			}
		}

		// Match wrapppers
		if (!matched) {
			inner: for (let element of SYNTAX.wrapper) {
				// Start of wrapppers
				if (string.slice(i, i+element.open.length).toString() == element.open) {

					// Search for the end of the wrapppers
					let j = i + element.open.length;
					for (; j<string.length; j++){
						// Skip escaping chars
						if (element.escape && string.getChar(j) == "\\") {
							j++;
							continue;
						}

						if (string.slice(j, j+element.close.length).toString() == element.close) {
							break;
						}
					}

					if (!element.discard) {
						let inner = string.slice(i+element.open.length, j);

						if (element.inner) {
							inner = Ingest(inner);
							// inner = "PROCESS"+inner;
						} else {
							inner = inner.toString();
						}

						result = new Token(
							element.name,
							inner,
							string.get(i).reference
						);
					}

					usedChars = (j+element.close.length) - i;
					matched = true;
					break inner;
				}
			}
		}

		// Match tokens
		if (!matched) {
			inner: for (let name in SYNTAX.tokens) {
				if (string.slice(i, i+SYNTAX.tokens[name].length).toString() == SYNTAX.tokens[name]){
					result = new Token(name, SYNTAX.tokens[name], string.get(i).reference);

					usedChars = SYNTAX.tokens[name].length;
					matched = true;
					break inner;
				}
			}
		}



		if (matched) {
			let cache = string.slice(lastI, i).toString();
			if (cache.length > 0){
				out.push(new Token(
					'token',
					cache,
					string.get(lastI).reference
				));
			}

			if (result !== null) {
				out.push(result);
			}

			i += usedChars-1;
			lastI = i+1;
		}
	}

	// Clear the remaining cache
	let cache = string.slice(lastI, i).toString();
	if (cache.length > 0){
		out.push(new Token(
			'token',
			cache,
			string.get(lastI).reference
		));
	}

	return out;
}


module.exports = Ingest;