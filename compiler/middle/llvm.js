const Alloc = require('./alloc');
const Argument = require('./argument.js');
const Branch = require('./branch.js');
const Branch_Unco = require('./branch_unco.js');
const Call = require('./call.js');
const Comment = require('./comment.js');
const Constant = require('./constant.js');
const Fragment = require('./fragment.js');
const Label = require('./label.js');
const Load = require('./load.js');
const Name = require('./name.js');
const Procedure = require('./procedure.js');
const Raw = require('./raw.js');
const Return = require('./return.js');
const Set = require('./set.js');
const Store = require('./store.js');
const Type = require('./type.js');
const WPad = require('./wpad');

module.exports = {
	Alloc, Argument,
	Branch, Branch_Unco,
	Call, Comment, Constant,
	Fragment,
	Label,
	Load,
	Name,
	Procedure,
	Raw, Return,
	Set, Store,
	Type,
	WPad
};
