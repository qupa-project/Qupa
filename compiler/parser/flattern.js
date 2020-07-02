function VariableList(node) {
	let out = [node.tokens[0].tokens];
	for (let i=1; i<node.tokens.length; i++) {
		out.push([ node.tokens[i][0], node.tokens[i][1].tokens ]);
	}

	return out;
}

function VariableStr (node) {
	let str = node.tokens[0].tokens;
	for (let i=1; i<node.tokens.length; i++) {
		str += node.tokens[i][0] + node.tokens[i][1].tokens;
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


module.exports = {
	VariableList, VariableStr, DataTypeStr
}