# Qupa
Queued Parallelism Language 


# CLI Ussage
The syntax tree and runtime must first be build for your system.
```
npm run build
```
Once you have the required files build, you can then compile an executable via:
> **Unix** ``./compile.bash test/pre-alpha/first-execution.qp``  
> **Windows** ``compile.bat test/pre-alpha/first-execution.qp``

## Flags
| Flag | Description |
| :- | :- |
| ``--source`` | The compiler will only generate the LLVM IR for the qupa code which does not include the runtime |
| ``-o {file}`` | Specify the output filename from the compiler