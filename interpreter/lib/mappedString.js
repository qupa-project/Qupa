class CharData{
	constructor (char, column, line, file){
		this.char   = char;
		this.column = column;
		this.line   = line;
		this.file   = file;
	}

	toString(){
		return `(${this.column}:${this.line})`;
	}
}


/**
 * Allows for string manipulation while maintaining character column and line location references
 */
class MappedString{
	constructor(string, filename="Unknown File"){
		this.filename = filename;
		this.data = [];

		let column = 0;
		let line   = 1;
		for (let char of string){
			this.data.push(new CharData(char, ++column, line, filename));

			// Move mapping position one line
			if (char == "\n"){
				column = 0;
				line++;
			}
		}
	}

	/**
	 * Return the number of characters in the string
	 * @returns {Number}
	 */
	get length(){
		return this.data.length;
	}

	/**
	 * Return a specific character at a given index
	 * @param {Number} index
	 * @returns {String}
	 */
	get(index){
		return this.data[index].char;
	}

	/**
	 * Return an address (file, column, line) of a specific character index
	 * @param {Number} index
	 * @returns {String}
	 */
	getAddress(index){
		return `"${this.filename}" `+this.data[index].toString();
	}

	/**
	 * Returns the contents of the mapped string as a normal string
	 * @returns {String}
	 */
	toString(){
		let output = "";

		for (let i=0; i<this.data.length; i++){
			output += this.data[i].char;
		}

		return output;
	}


	/**
	 * Slice the mapped string - behaves as normal string slice
	 * @param {Number} start
	 * @param {Number} end
	 * @returns {MappedString}
	 */
	slice(start, end){
		let result = new MappedString("", this.filename);
		result.data = this.data.slice(start, end);

		return result;
	}
}


module.exports = MappedString;
