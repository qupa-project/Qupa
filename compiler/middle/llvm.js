const Add = require('./add.js');
const Alloc = require('./alloc');
const Argument = require('./argument.js');
const Bitcast = require('./bitcast.js');
const Branch = require('./branch.js');
const Branch_Unco = require('./branch_unco.js');
const Call = require('./call.js');
const Comment = require('./comment.js');
const Constant = require('./constant.js');
const Div = require('./div.js');
const Extend = require('./extend.js');
const Fragment = require('./fragment.js');
const GEP = require('./gep.js');
const Instruction = require('./instruction');
const Label = require('./label.js');
const Load = require('./load.js');
const Mul = require('./mul.js');
const Name = require('./name.js');
const Procedure = require('./procedure.js');
const Raw = require('./raw.js');
const Rem = require('./rem.js');
const Return = require('./return.js');
const Set = require('./set.js');
const Store = require('./store.js');
const Struct = require('./struct.js');
const Sub = require('./sub.js');
const Trunc = require('./trunc.js');
const Type = require('./type.js');
const WPad = require('./wpad');

module.exports = {
	Add, Alloc, Argument,
	Bitcast, Branch, Branch_Unco,
	Call, Comment, Constant,
	Div,
	Extend,
	Fragment,
	GEP,
	Instruction,
	Label, Load,
	Mul,
	Name,
	Procedure,
	Raw, Return,
	Rem,
	Set, Store, Struct, Sub,
	Trunc, Type,
	WPad
};
