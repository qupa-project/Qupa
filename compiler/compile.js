const Project = require('./component/project.js');

const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

const version = "0.0.0";
const root = path.resolve("./");

if (process.argv.indexOf("-v") != -1) {
	console.info(version);
	process.exit(0);
}

let index = process.argv.indexOf('-o');
let output = "out.ll";
if (index != -1 && index > 2) {
	output = process.argv[index+1];
}

let origin = path.resolve(root, process.argv[2]);
if (!fs.existsSync(origin)) {
	console.error(`Invalid file name: ${origin}`);
	process.exit(1);
}

let project = new Project(root);
project.import(origin);

project.link();
if (project.error) {
	console.error("\nLinker error");
	process.exit(1);
}
let asm = project.compile();

fs.writeFileSync(output, asm.toLLVM(), 'utf8');

if (process.argv.indexOf('--source') == -1) {
	console.info("Compiling to executable...");
	let runtime_path = path.resolve(__dirname, "./../runtime/runtime.ll");

	let exec_out = output.slice(0, output.indexOf("."));
	if (os.platform() == "win32") {
		exec_out += ".exe";
	} else if (os.platform() == "darwin") {
		exec_out += ".app";
	} else {
		exec_out += ".o";
	}

	exec(`clang++ ${runtime_path} ${output} -o ${exec_out}`, (err) => {
		if (err) {
			console.error(err);
		}
	})
}