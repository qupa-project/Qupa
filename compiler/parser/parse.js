const BNF = require('bnf-parser');
const fs = require('fs');

const syntax = BNF.types.BNF_Tree.fromJSON(
	JSON.parse(fs.readFileSync(__dirname+"/qupa.json", 'utf8'))
);


function Simplify_Program(node) {
	let out = [];
	for (let inner of node.tokens[1]) {
		out.push(Simplify_Stmt_Top(inner.tokens[0][0]));
	}
	node.tokens = out;

	// Remove irrelevant internal data
	node.reached = null;
	return node;
}

function Simplify_Stmt_Top(node) {
	let inner;
	switch (node.tokens[0].type) {
		case "comment":
			inner = node.tokens[0];
			break;
		case "external":
			inner = Simplify_External(node);
			break;
		case "function":
			inner = Simplify_Function(node);
			break;
		case "library":
			inner = Simplify_Library(node);
			break;
		case "class":
			inner = Simplify_Class(node);
			break;
		case "template":
			inner = Simplify_Template(node);
			break;
		case "flag_definition":
			inner = Simplify_Flag_Definition(node);
			break;
		default:
			throw new TypeError(`Unexpected top level statement ${node.tokens[0].type}`);
	}

	// Remove irrelevant internal data
	inner.reached = null;
	return inner;
}

function Simplify_Library(node) {
	// TODO
	return node;
}

function Simplify_Class(node) {
	// TODO
	return node;
}
function Simplify_Template(node) {
	// TODO
	return node;
}

function Simplify_Flag_Definition(node) {
	// TODO
	return node;
}

function Simplify_External(node) {
	// TODO
	return node;
}

function Simplify_Function(node) {
	// TODO
	return node;
}


function Parse (data, filename){
	// Parse the file and check for errors
	let result = BNF.Parse(data, syntax, "program");

	if (result.hasError || result.isPartial) {	
		let ref = result.tree.ref.reached.getReach();

		let msg = filename ? `${filename}: ` : "";
		msg += `Syntax error at ${ref.toString()}\n`;
		msg += `  ${BNF.Message.HighlightArea(data, ref).split('\n').join('\n  ')}\n\n`;
		msg += `  Interpreted: ${result.tree.reached.getCausation()}`;
		console.error(msg);
		process.exit(1);
	}

	return Simplify_Program(result.tree);
}

module.exports = Parse;