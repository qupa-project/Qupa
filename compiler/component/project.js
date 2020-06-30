const File = require('./file.js');
const { Generator_ID } = require('./generate.js');

const base = `attributes #0 = { noinline nounwind optnone uwtable "correctly-rounded-divide-sqrt-fp-math"="false" "disable-tail-calls"="false" "frame-pointer"="none" "less-precise-fpmad"="false" "min-legal-vector-width"="0" "no-infs-fp-math"="false" "no-jump-tables"="false" "no-nans-fp-math"="false" "no-signed-zeros-fp-math"="false" "no-trapping-math"="false" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "unsafe-fp-math"="false" "use-soft-float"="false" }

!llvm.module.flags = !{!0}
!llvm.ident = !{!2}

!0 = !{i32 1, !"wchar_size", i32 2}
!1 = !{i32 7, !"PIC Level", i32 2}`;

class Project {
	constructor(rootPath) {
		this.rootPath = rootPath;
		this.files  = [];
		this.idGen = new Generator_ID(Math.floor(Math.random()*(2**20)));

		this.error = false;
	}

	import(path) {
		for (let file of this.files) {
			if (file.getPath() == path) {
				return file.getFileID();
			}
		}

		let temp = new File(this, this.idGen.next(), path);
		this.files.push(temp);

		return temp;
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
		let fragment = [];
		for (let file of this.files) {
			fragment.push(file.compile());
		}

		return fragment.join("\n\n\n")+"\n\n"+base;
	}
}


module.exports = Project;