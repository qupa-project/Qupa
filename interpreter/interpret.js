const MappedString = require('./lib/mappedString.js');
const Patternize = require('./parser/patternize.js');
const Tokenizer = require('./lexer/tokenizer.js');
const fs = require('fs');



let file = fs.readFileSync('./example.qp', 'utf8');
file = new MappedString(file, './example.qp');
// console.log(file);
// let res = Patternize(file);

let tokens = Tokenizer(file);

let patterns = Patternize(tokens);

console.log(patterns);
// console.log(JSON.stringify(res, null, 2));
fs.writeFileSync('out-token.json', JSON.stringify(tokens, null, 2));
fs.writeFileSync('out-patterns.json', JSON.stringify(patterns, null, 2));

