const BNF = require('bnf-parser');
const fs = require('fs');

let data = fs.readFileSync(__dirname+'/qupa.bnf', 'utf8');

let syntax = BNF.Build(data, 'qupa.bnf');

fs.writeFileSync(__dirname+'/qupa.json', JSON.stringify(syntax));
console.log('Build Syntax');