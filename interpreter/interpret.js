const MappedString = require('./lib/mappedString.js');
const Patternize = require('./lexer/patternize.js');
const fs = require('fs');



let file = fs.readFileSync('./example.qp', 'utf8');
file = new MappedString(file, './example.qp');
// console.log(file);
let res = Patternize(file);


console.log(res);

