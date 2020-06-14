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
			inner = Simplify_External(node.tokens[0]);
			break;
		case "function":
			inner = Simplify_Function(node.tokens[0]);
			break;
		case "library":
			inner = Simplify_Library(node.tokens[0]);
			break;
		case "class":
			inner = Simplify_Class(node.tokens[0]);
			break;
		case "template":
			inner = Simplify_Template(node.tokens[0]);
			break;
		case "flag_definition":
			inner = Simplify_Flag_Definition(node.tokens[0]);
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
	let out = [];

	out.push(node.tokens[2][0]);                         // mode
	out.push(                                            // body
		Simplify_External_Body(node.tokens[6][0]).tokens
	); 
	
	node.tokens = out;
	node.reached = null;
	return node;
}
function Simplify_External_Body(node) {
	let out = [];

	for (let inner of node.tokens[0]) {
		out.push(Simplify_External_Term(inner.tokens[0][0]));
	}
	
	node.tokens = out;
	node.reached = null;
	return node;
}
function Simplify_External_Term(node) {
	let inner;
	switch (node.tokens[0].type) {
		case "function_outline":
			inner = Simplify_Function_Outline(node.tokens[0]);
			break;
		case "structure":
			inner = Simplify_Structure(node.tokens[0]);
			break;
		case "type_def":
			inner = Simplify_Type_Def(node.tokens[0]);
			break;
		case "declare":
			inner = Simplify_Declare(node.tokens[0]);
			break;
		default:
			throw new TypeError(`Unexpected external statement ${node.tokens[0].type}`);
	}
	
	return inner;
}

function Simplify_Structure(node) {
	// TODO
	return node;
}

function Simplify_Type_Def(node) {
	let out = [];
	out.push(                          // name
		Simplify_Name(node.tokens[2][0])
	);
	out.push(                          // size
		Simplify_Integer(node.tokens[6][0])
	);

	node.tokens = out;
	node.reached = null;
	return node;
}



function Simplify_Name(node) {
	let out = node.tokens[0][0].tokens[0].tokens;
	for (let inner of node.tokens[1]) {
		if (Array.isArray(inner.tokens)) {
			if (inner.tokens[0].type == "letter") {
				out += inner.tokens[0].tokens[0].tokens;
			} else {
				out += inner.tokens[0].tokens;
			}
		} else {
			out += inner.tokens;
		}
	}

	node.tokens  = out;
	node.reached = null;
	return node;
}
function Simplify_Data_Type(node) {
	let inner;
	switch (node.tokens[0].type) {
		case "variable":
			inner = Simplify_Variable(node.tokens[0]);
			break;
		case "pointer":
			inner = Simplify_Pointer(node.tokens[0]);
			break;
		case "deref":
			inner = Simplify_Deref(node.tokens[0]);
			break;
		default:
			throw new TypeError(`Unexpected data type ${node.tokens[0].type}`);
	}

	node.reached = null;
	node.tokes = inner;
	return node;
}
function Simplify_Integer(node) {
	let out = "";
	for (let inner of node.tokens[0]) {
		out += inner.tokens;
	}

	node.tokens  = out;
	node.reached = null;
	return node;
}



function Simplify_Variable (node) {
	let out = [];
	out.push(Simplify_Name( node.tokens[0][0] )); // root

	for (let access of node.tokens[1]) {
		access = access.tokens[0];
		switch (access.type) {
			case "accessor_dynamic":
				out.push([ "[]", Simplify_Call_Args(access.tokens[2][0]) ]);
				break;
			case "accessor_static":
				out.push( [".", Simplify_Name(access.tokens[1][0])] );
				break;
			case "accessor_refer":
				out.push( ["->", Simplify_Name(access.tokens[1][0])] );
				break;
			default:
				throw new TypeError(`Unexpected accessor type ${access.type}`);
		}
	}
	
	node.tokens = out;
	node.reached = null;
	return node;
}

function Simplify_Pointer (node) {
	let out = ["@"];
	out.push( Simplify_Variable(node.tokens[1][0]) );
	
	node.tokens = out;
	node.reached = null;
	return node;
}

function Simplify_Deref (node) {
	let out = ["$"];
	out.push( Simplify_Variable(node.tokens[1][0]) );

	node.tokens = out;
	node.reached = null;
	return node;
}



function Simplify_Declare(node) {
	// TODO
	return node;
}


function Simplify_Function(node) {
	// TODO
	return node;
}
function Simplify_Function_Outline(node) {
	node.tokens = Simplify_Function_Head(node.tokens[0][0]).tokens;
	node.reached = null;
	return node;
}
function Simplify_Function_Head (node) {
	out = [];
	out.push(Simplify_Data_Type  (node.tokens[0][0])); // Return type
	out.push(Simplify_Name       (node.tokens[2][0])); // Name
	out.push(Simplify_Func_Args  (node.tokens[4][0])); // arguments
	out.push(Simplify_Func_Flags (node.tokens[6][0])); // flags

	node.tokens = out;
	node.reached = null;
	return node;
}
function Simplify_Func_Args (node) {
	// TODO
	return node;
}
function Simplify_Func_Flags (node) {
	// TODO
	return node;
}
function Simplify_Call_Args (node) {
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