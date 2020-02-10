const MappedString = require('./lib/mappedString.js');
const Patternize = require('./parser/patternize.js');
const Tokenizer = require('./lexer/tokenizer.js');
const fs = require('fs');



let file = fs.readFileSync('./example.qp', 'utf8');
file = new MappedString(file, './example.qp');
// console.log(file);
// let res = Patternize(file);

console.log('\n\n\n================================');
console.log('   Tokens');
console.log('================================');
let tokens = Tokenizer(file);
console.log(tokens);


console.log('\n\n\n================================');
console.log('   Patterns');
console.log('================================');
let patterns = Patternize(tokens);

if (patterns === null) {
	console.error(" ");
	console.error("Unable to compile code due to interpretation errors");
}

console.log(patterns);
// fs.writeFileSync('out-patterns.json', JSON.stringify(patterns, null, 2));

