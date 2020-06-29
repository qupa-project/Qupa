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


module.exports = {
	VariableList, VariableStr
}