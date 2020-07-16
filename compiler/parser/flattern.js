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

function DataTypeStr (node) {
	if (node.tokens[0].type == "variable") {
		return VariableStr(node.tokens[0]);
	}

	let target = node.tokens[0];
	let out = "";
	while (target.type == "pointer" || target.type == "deref") {
		out += target.type == "pointer" ? "@" : "$";
		target = target.tokes[0];
	}
	out += VariableStr(target);

	return out;
}

function PointerLvl(int) {
	let str = "";
	while (int > 0) {
		str += "@";
		int--;
	}

	return str;
}


module.exports = {
	VariableList, VariableStr, DataTypeStr, PointerLvl
}