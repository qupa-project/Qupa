const fs = require('fs');
const GRAMMER = JSON.parse(fs.readFileSync(__dirname+'/grammer.json', 'utf8'));




function MatchElementName (value, target){
	return value.slice(0, target.length) == target;
}




let scopes = [];
let patterns = [];


function GetScope (name) {
	for (let i=0; i<scopes.length; i++){
		if (scopes[i].name == name){
			return scopes[i];
		}
	}

	return null;
}
function GetPatternTemplates (name) {
	let results = [];

	for (let i=0; i<patterns.length; i++){
		if (MatchElementName(patterns[i].name, name)){
			results.push(patterns[i]);
		}
	}

	return results;
}


class Scope {
	constructor(name, patterns) {
		this.name = name;
		this.patterns = patterns;

		this.linked = false;
	}

	link() {
		if (this.patterns != null) {
			let patternNames = this.patterns;
			this.patterns = [];

			for (let name of patternNames) {
				let patterns = GetPatternTemplates(name);

				if (patterns.length == 0) {
					console.error("Error: Grammer config error");
					console.error(`  Unable to find pattern "${name}" as requested in grammer scope "${this.name}"`);
					process.exit(1);
				}

				this.patterns = this.patterns.concat(patterns);
			}

			// Put the most complex matches first
			this.patterns.sort((a, b)=>{
				if (a.tokens.length > b.tokens.length) {
					return -1;
				} else if (a.tokens.length < b.tokens.length) {
					return 1;
				} else {
					return 0;
				}
			});
		}

		this.linked = true;
	}
}


class PatternTemplate {
	constructor(name, tokens, sub) {
		this.name = name;
		this.tokens = tokens;
		this.sub = sub;

		this.linked = false;
	}


	link () {
		let scopes = this.sub;
		this.sub = [];

		for (let name of scopes) {
			if (typeof(name) == "string") {
				let pattern = GetScope(name);

				if (pattern === null) {
					console.error("Error: Grammer config error");
					console.error(`  Unable to find scope "${name}" as requested in pattern "${this.name}"`);
					process.exit(1);
				}

				this.sub.push(pattern);
			} else {
				this.sub.push(null);
			}
		}

		this.linked = true;
	}
}




// Load in grammer elements
for (let element of GRAMMER.scope) {
	scopes.push(new Scope(element.name, element.patterns));
}
for (let element of GRAMMER.pattern) {
	patterns.push(new PatternTemplate(element.name, element.match, element.sub));
}

// Link grammer elements
for (let element of scopes) {
	element.link();
}
for (let element of patterns) {
	element.link();
}



module.exports = GetScope('global');