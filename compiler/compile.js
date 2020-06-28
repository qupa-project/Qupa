const Project = require('./component/project');

const path = require('path');

const version = "0.0.0";
const root = path.resolve("./");

if (process.argv.indexOf("-v") != -1) {
	console.info(version);
	process.exit(0);
}

let origin = path.resolve(root, process.argv[2]);

let project = new Project(root);
project.import(origin);

project.link();
if (project.error) {
	console.error("\nLinker error");
	process.exit(1);
}
// let asm = project.compile();

// console.log(project);