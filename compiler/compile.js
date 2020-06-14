const Project = require('./component/project');

const path = require('path');

const version = "0.0.0";
const root = path.resolve("./");

if (process.argv.indexOf("-v") != -1) {
	console.log(version);
	process.exit(0);
}

let origin = path.resolve(root, process.argv[2]);

let project = new Project(root);
project.import(origin);

// console.log(project);