const MappedString = require('./../mappedString.js');

class Pattern{
	constructor(){
		// How complete a match is this pattern (percent)
		this.match = 0;

		// Why isn't the pattern matching?
		this.fault = "";

		// Any sub information or patterns part of this pattern
		this.information = [];

		// Number of characters consumed by this pattern
		this.consumed = 0;
	}

	/**
	 * Get the matching criteria as a percent
	 * Store any information that may be required for processing in case of exact match
	 * @param {MappedString} - The string to apply the match to
	 */
	generateMatch(string){
		this.match = 0;

		return;
	}

	/**
	 * Process information and sub patterns of this pattern
	 */
	process(){
		return;
	}
}


/**
 * Check if a given string is entirely white space
 * @param {String} string
 */
function IsWhiteSpace(string){
	for (let char of string){
		if ( (' \t\r\n').indexOf(char) == -1 ){
			return false;
		}
	}

	return true;
}


module.exports = Pattern;
module.exports.IsWhiteSpace = IsWhiteSpace;
