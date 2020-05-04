const fs = require('fs');
let data = fs.readFileSync('./bnf.bnf', 'utf8');
let tree = JSON.parse(fs.readFileSync('./bnf.json', 'utf8'));

let Compile = require('./compiler.js');
let Parse = require('./parser.js');

let res = Parse(data, tree, "program");
fs.writeFileSync('temp-tree.json', JSON.stringify(res, null, 2));

if (res.hasError || res.isPartial) {
	console.error("BNF didn't parse correctly");
	process.exit(1);
}


let syntax = Compile(res.tree);
fs.writeFileSync('bnf.json', JSON.stringify(syntax, null, 2));