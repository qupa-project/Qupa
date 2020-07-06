const { Generator_ID } = require('./generate.js');
const LLVM = require('./../middle/llvm.js');
const File = require('./file.js');

const base = new LLVM.Raw(`attributes #0 = { noinline nounwind optnone uwtable "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "frame-pointer"="none" "less-precise-fpmad"="false" "min-legal-vector-width"="0" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }`);

class Project {
	constructor(rootPath, config = {}) {
		this.rootPath = rootPath;
		this.files  = [];
		this.idGen = new Generator_ID(Math.floor(Math.random()*(2**20)));

		this.config = {
			caching: config.caching === undefined ? true : config.caching
		};

		this.exports = [];

		this.error = false;
	}

	import(path) {
		for (let file of this.files) {
			if (file.getPath() == path) {
				return file;
			}
		}

		let temp = new File(this, this.idGen.next(), path);
		this.files.push(temp);
		temp.parse();

		return temp;
	}

	registerExport(name) {
		if (this.exports.indexOf(name) == -1) {
			this.exports.push(name);
			return true;
		} else {
			return false;
		}
	}

	link(){
		for (let file of this.files) {
			file.link();
		}
	}

	markError() {
		this.error = true;
	};


	compile() {
		let fragment = new LLVM.Fragment();

		for (let file of this.files) {
			fragment.append(file.compile());
			fragment.append(new LLVM.WPad(3));
		}
		fragment.append(new LLVM.WPad(3));
		fragment.append(base);

		return fragment;
	}
}


module.exports = Project;