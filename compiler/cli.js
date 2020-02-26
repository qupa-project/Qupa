const Compiler = require('./compiler.js');
const path = require("path");
const fs = require("fs");

const VERSION = "v0.0.0";




if (process.argv[2] == "-v"){
	console.log(VERSION);
	process.exit(0);
}

let filename = process.argv[2];
let output = "a.cpp";
let config = {
	verbose: false
}

// Arguments
for (let i=3; i<process.argv.length; i++){
	switch (process.argv[i]) {
		case "-verbose":
			config.verbose = true;
			break;
		case "-o":
			if (++i >= process.argv.length) {
				console.error("No specified output location");
				process.exit(1);
			}

			output = process.argv[i];
			break;
		default:
			console.error("Unknown argument", process.argv[i]);
			process.exit();
	}
}

Compiler.Configure(config);

fs.writeFileSync(
	output,
	Compiler.Compile(
		path.join(process.argv[1], filename),
		config
	),
);


