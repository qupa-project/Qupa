const BNF = require('bnf-parser');
const fs = require('fs');

const syntax = BNF.types.BNF_Tree.fromJSON(
	JSON.parse(fs.readFileSync(__dirname+"/qupa.json", 'utf8'))
);


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
	
	// TODO: Simplfy tree output

  return result.tree;
}

module.exports = Parse;