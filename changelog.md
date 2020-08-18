# Change Log

## v0.0.4

### Added

+ Constants are not longer forcibly written to memory
+ If/While statements now use phi statements to result value changes

### Tweaks

+ New LLVM ID assignment system to allow for out of order code generation

### Fixes

+ Fixed not flushing pointers before function calls
+ Fixed not flushing pointers on return function
+ Fixed not flushing values before while loop
+ Fixed compiler crashing with invalid array access on non-array

## v0.0.3

### Added

+ Statically defined length arrays
+ Dynamically defined length arrays
+ Primative compile time resolved function ``sizeof()``
+ Primative function ``static_cast`` - allows primative type conversion, and pointer conversion
+ Primative memory allocation functions ``malloc()``/``free()``
+ Arithmetic opperations for primative types (``+``, ``-``, ``*``, ``/``, ``%``)
+ Boolean comparison for primative types (``<``, ``>``, ``<=``, ``>=``, ``==``, ``!=``)
+ Boolean operations (and/or/not)

### Fixes

+ Incorrect datatype error logging
+ Fixed template datatype parsing

### Changes

+ Templates usable for datatype access
+ Bitcasting replaced with ``static_cast``
+ Imports now use multiple search directories
+ Split malloc and printing to separate standard libraries
+ Removed add/sub/mul/div/rem primative functions