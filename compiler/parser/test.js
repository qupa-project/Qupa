// rebuild the syntax
require('./build.js');

const Parser = require('./parse.js');
const fs = require('fs');


console.log("Running Parse Test")
let files = fs.readdirSync("./std/").reverse().map(x => `./std/${x}`)
	.concat( fs.readdirSync("./test/").reverse().map(x => `./test/${x}`) );

for (let file of files) {
	if (file.slice(-3) != ".qp") {
		continue;
	}

	console.log(`  Parsing ${file}`);
	let data = fs.readFileSync(file, 'utf8');
	Parser(data, file);
}

console.log("Finished parse test");