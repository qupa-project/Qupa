# Change Log

## Unreleased

### Added

+ Constants are not longer forcibly written to memory

### Fixes

+ Fixed not flushing values before while loop
+ Fixed if statment not affecting reloads

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