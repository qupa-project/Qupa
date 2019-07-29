const Pattern = require('./pattern.js');


class Function extends Pattern{
	generateMatch(string){
		let conditions = 2;
		let result = "";
		this.match = 0;


		// Does the function have a return type?
		result = this.hasType(string);
		if (result.consumed != 0){
			this.fault = "Missing function return type";
			this.match /= conditions;
			return;
		}
		string = string.slice(result.consumed);  // Remove the use portion of the string
		this.information.push(result.data);      // Push the used portion to information about the match
		this.match++;                            // Increase the match percentage


		// Does the function have a return type?
		result = this.hasName(string);
		if (result.consumed != 0){
			this.fault = "Missing function name";
			this.match /= conditions;
			return;
		}
		string = string.slice(result.consumed);  // Remove the use portion of the string
		this.information.push(result.data);      // Push the used portion to information about the match
		this.match++;                            // Increase the match percentage


		this.match /= conditions;
	}



	hasType(string){
		let output = "";
		var i = 0;

		// Skip any leading whitespace
		for (i=i;
			i<string.length &&
			Pattern.IsWhiteSpace(string.get(i));
		i++){}

		// Cache all characters until a white space is reached
		for (var i=0;
			i<string.length &&
			!Pattern.IsWhiteSpace(string.get(i));
		i++){
			output += string.get(i);
		}

		if (string.get(i) == " "){
			return {data: output, consumed: i};
		}else{
			return {data: "", consumed: 0};
		}
	}
	hasName(string){
		let output = "";
		var i = 0;

		// Skip any leading whitespace
		for (i=i;
			i<string.length &&
			Pattern.IsWhiteSpace(string.get(i));
		i++){}

		// Cache all characters until a white space is reached
		for (var i=0;
			i<string.length &&
			!Pattern.IsWhiteSpace(string.get(i));
		i++){
			output += string.get(i);
		}

		if (string.get(i) == " "){
			return {data: output, consumed: i};
		}else{
			return {data: "", consumed: 0};
		}
	}
	hadArguments(string){

	}

	process(){}
}


module.exports = Function;
