# Qupa
Queued Parallelism Language 


# CLI Ussage
The syntax tree and runtime must first be build for your system.
```
npm run build
```
Once you have the required files build, you can then compile an executable via:
> **Unix** ``./compile.bash test/pre-alpha/first-execution.qp``  
> **Windows** ``compile test/pre-alpha/first-execution.qp``

## Flags
| Flag | Description |
| :- | :- |
| ``-S {llvm?}`` | The flag specifies not to build a binary, if optional term ``llvm`` is entered it will only output LLVM-IR, otherwise it will output the assembly of the target platform |
| ``-o {file}`` | Specify the output filename from the compiler |
| ``--no-caching`` | Specifies that the compiler should not reuse values cached in registers, and should instead reload any reference values each time they are used