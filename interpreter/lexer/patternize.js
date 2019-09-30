const fs = require('fs');
const SYNTAX = JSON.parse(fs.readFileSync(__dirname+'/syntax.json', 'utf8'));



/**
 * Returns the number of characters that match the supplied expression
 * @param {MappedString} string 
 * @param {String} expression 
 */
function ExpressionMatches(string, expression){
	let progress = 0;

	let i = 0;
	for (; i<expression.length; i++){
		let escaped = false;

		// Ran out of characters
		if (progress >= string.length) {
			return 0;
		}

		// Escaped special characters
		if (expression[i] == "\\"){
			escaped = true;
			i++;
		} 
		
		if (!escaped && expression[i] == "+" || expression[i] == "*"){ // Wildchar match
			let requiresChars = (expression[i] == "+");

			// Look at next match
			i++;

			let j=0;
			while ( string.get(progress) != expression[i] ){
				progress++;
				j++;

				// Ran out of characters
				if (progress >= string.length) {
					return 0;
				}
			}
			progress++;

			if (j < 1 && requiresChars){
				return 0;
			}
		} else if (string.get(progress) == expression[i]) {                // Exact char match
			progress++;
		} else {                                                       // Match failure
			return 0;
		}
	}

	if (i != expression.length){
		return 0;
	} else {
		return progress;
	}
}



/**
 * 
 * @param {MappedString} string 
 */
function Process(string, level="global"){
	let output = [];

	for (let i=0; i<string.length; i++){
		let match = false;

		// Ignore white space
		for (let j=0; !match && j<SYNTAX.whitespace.length; j++){
			if (string.get(i) == SYNTAX.whitespace[j]){
				match = true;
			}
		}
		
		// Skip comments
		for (let j=0; !match && j<SYNTAX.comment.length; j++){
			let chars = ExpressionMatches(string.slice(i), SYNTAX.comment[j].match);

			if (chars > 0){
				j += chars - 1;
				match = true;
			}
		}

		// Match tokens
		for (let j=0; !match && j<SYNTAX[level].length; j++){
			let chars = ExpressionMatches(
				string.slice(i),
				SYNTAX[level][j].match
			);

			if (chars > 0){
				// Store the components found to match
				let forward = string.slice(i, i+chars);

				output.push({
					type: SYNTAX[level][j].name,
					data: string.slice(i, i+chars),
					line: forward.data[0].line,
					col: forward.data[0].column,
					file: forward.data[0].file
				})

				i += chars - 1;
				match = true;
			}
		}

		if (!match){
			console.error("Unexpected token;");
			console.error(`  file : ${string.data[i].file}`);
			console.error(`  line : ${string.data[i].line}`);
			console.error(`  col  : ${string.data[i].column}`);
			console.error(`  char : ${string.data[i].char}`);
			process.exit(1);
		}
	}

	return output;
}


// const MappedString = require('../lib/mappedString.js');
// let str = new MappedString("int main () { return; }");
// let res = ExpressionMatches(str, "+ +(*)*{*}");
// console.log(res);


module.exports = Process;