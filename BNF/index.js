const fs = require('fs');
let data = fs.readFileSync('./test.bnf', 'utf8');
let tree = JSON.parse(fs.readFileSync('./bnf.json', 'utf8'));

let Compile = require('./compiler.js');
let Parse = require('./parser.js');

// data = `"\\"" ( "\\"" | "\\n" | "\\\\" | "\\t" | s!( "\\"" | "\\\\" ) )+ "\\""`
let res = Parse(data, tree, "program");
console.log(res);
fs.writeFileSync('temp-tree.json', JSON.stringify(res, null, 2));


let syntax = Compile(res.tree);
console.log(syntax);
fs.writeFileSync('temp-syntax.json', JSON.stringify(syntax, null, 2));