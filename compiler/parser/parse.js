const BNF = require('bnf-parser');
const fs = require('fs');

const syntax = BNF.types.BNF_Tree.fromJSON(
	JSON.parse(fs.readFileSync(__dirname+"/qupa.json", 'utf8'))
);


function Parse (data, filename){
  // Parse the file and check for errors
  let tree = BNF.Parse(data, syntax, "program");

  if (tree.hasError || tree.isPartial) {	
    let ref = null;
    if (tree.tree instanceof BNF.types.BNF_SyntaxError) {
      ref = tree.tree.ref;
    } else {
      ref = tree.tree.ref.reached || tree.tree.ref.end;
    }

    let msg = filename ? `${filename}: ` : "";
    msg += `Syntax error at ${ref.toString()}\n`;
    msg += "  " + BNF.Message.HighlightArea(data, ref).split('\n').join('\n  ');
    console.error(msg);
    process.exit(1);
	}
	
	// TODO: Simplfy tree output

  return tree;
}

module.exports = Parse;