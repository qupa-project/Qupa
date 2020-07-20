function VariableList(node) {
	let out = [
		node.tokens[0].length,
		node.tokens[1].tokens
	];
	for (let i=2; i<node.tokens.length; i++) {
		if (node.tokens[i][0] == "[]") {
			out.push([ "[]", node.tokens[i][1].tokens.map( x => VariableList(x) ) ]);
		} else {
			out.push([ node.tokens[i][0], node.tokens[i][1].tokens ]);
		}
	}

	return out;
}

function VariableStr (node) {
	let str = node.tokens[0] + node.tokens[1].tokens;
	for (let i=2; i<node.tokens.length; i++) {
		if (node.tokens[i][0] == "[]") {
			str += `[${node.tokens[i][1].tokens.map( x => VariableStr(x) )}]`;
		} else {
			str += node.tokens[i][0] + node.tokens[i][1].tokens;
		}
	}

	return str;
}


function DataTypeList(node) {
	if (node.type == "constant") {
		return [ "lit", node.tokens[0].tokens ];
	}

	let out = [
		[ node.tokens[0], node.tokens[1].tokens ]
	];
	for (let access of node.tokens[2]){
		if (access.tokens[0] == "[]") {
			out.push([
				"[]",
				access.tokens[1].tokens.map( x => DataTypeList(x) )
			]);
		} else {
			out.push([access.tokens[0], access.tokens[1].tokens]);
		}
	}

	return out;
}

function DataTypeStr (node) {
	if (node.type == "constant") {
		return node.tokens[0].tokens;
	}

	let str = DuplicateChar(node.tokens[0], "@") + node.tokens[1].tokens;
	for (let access of node.tokens[2]){
		if (access.tokens[0] == "[]") {
			str += `[${access.tokens[1].tokens.map( x => DataTypeStr(x) ).join(", ")}]`;
		} else {
			str += access.tokens[0] + access.tokens[1].tokens;
		}
	}

	return str;
}

/**
 *
 * @param {Number} count
 * @param {String} char
 */
function DuplicateChar(count = 1, char = "@"){
	let str = "";
	while (count > 0) {
		str += char;
		count--;
	}

	return str;
}


module.exports = {
	VariableList, VariableStr, DataTypeList, DataTypeStr, DuplicateChar
}