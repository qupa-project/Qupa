const BNF = require('bnf-parser');
const fs = require('fs');

const syntax = BNF.types.BNF_Tree.fromJSON(
	JSON.parse(fs.readFileSync(__dirname+"/qupa.json", 'utf8'))
);


function Parse (data, filename){
  // Parse the file and check for errors
  let tree;
  try {
    tree = BNF.Parse(data, syntax, "program");
  } catch(e) {
    throw new Error(`An internal error occured when attempting to parse the data;\n  ${e}`)
  }

  if (tree.hasError || tree.isPartial) {	
    let ref = null;
    if (tree.tree instanceof BNF.types.BNF_SyntaxError) {
      ref = tree.tree.ref;
    } else {
      ref = tree.tree.ref.end;
    }

    let msg = filename ? `${filename}: ` : "";
    msg += `BNF did not parse correctly due to a syntax error at ${ref.toString()}\n`;
    msg += "  " + BNF.Message.HighlightArea(data, ref).split('\n').join('\n  ');
    throw new SyntaxError(msg);
	}
	
	// TODO: Simplfy tree output

  return tree;
}

module.exports = Parse;