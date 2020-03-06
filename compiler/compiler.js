const Project = require('./lib/project.js');


let settings = {
	verbose: false
};


function Configure (config){
	settings = config;
}

function Compile(filename) {
	let project = new Project(filename);
	project.load(filename, "cli");
}


module.exports = { Configure, Compile };