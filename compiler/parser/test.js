// rebuild the syntax
require('./build.js');

const Parser = require('./parse.js');
const fs = require('fs');


let files = fs.readdirSync("./std/");
files = ['qupa.qp'];

for (let file of files) {
	let filename = "./std/"+file;
	let data = fs.readFileSync(filename);

	console.log(`Parsing ${filename}`);
	Parser(data, filename);
}