const Project = require('./component/project.js');

const util = require('util');
const { resolve } = require('path');
const { fstat } = require('fs');

const exec = util.promisify( require('child_process').exec );
const writeFile = util.promisify( require('fs').writeFile );


let config = {
	caching: true,
	output: "out",
	source: false,
	execute: false
};

async function Compile(root) {
	// Load required files
	let project = new Project(root, {
		caching: config.caching
	});
	project.import(root, true);

	// Link elements
	console.info("Linking...");
	project.link();
	if (project.error) {
		console.error("\nLinker error");
		process.exit(1);
	}

	// Compile to LLVM
	console.info("Processing...");
	let asm = project.compile();
	if (project.error) {
		console.error("\nUncompilable errors");
		process.exit(1);
	}

	await writeFile(`${config.output}.ll`, asm.flattern(), 'utf8');

	let runtime_path = resolve(__dirname, "./../runtime/runtime.ll");
	let fail = false;
	try {
		await exec(`clang++ ${runtime_path} ${config.output}.ll`);
	} catch (e) {
		fail = true;
	}

	console.log(fail ? "  FAILED" : "  success");
}




let tests = [
	"array/main.qp",
	"cast/main.qp",
	"compare/main.qp",
	"dynamic-alloc/main.qp",
	"first-execution/main.qp",
	"if-statement/main.qp",
	"library-behaviour/main.qp",
	"math/main.qp",
	"pointer/main.qp",
	"string/main.qp",
	"structure/main.qp",
	"while-loop/main.qp"
].map( x => {
	return resolve("./test/pre-alpha", x);
});

async function Test () {
	let i = 0;
	for (let file of tests) {
		console.info("\nTest", i++, ' of ', tests.length);
		await Compile(file);
	}
}

Test();