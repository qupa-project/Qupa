// rebuild the syntax
require('./build.js');

const Parser = require('./parse.js');
const fs = require('fs');


let files = fs.readdirSync("./std/").reverse();
// files = ['integer.qp'];

for (let file of files) {
	if (file.slice(-3) != ".qp") {
		continue;
	}

	let filename = "./std/"+file;
	console.log(`Parsing ${filename}`);
	let data = fs.readFileSync(filename, 'utf8');
	Parser(data, filename);
	console.log("  Done");
}