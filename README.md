# Qupa

A compiled programming language based around having individual queues for each thread allowing event and callback driven multithreading behaviour.

## Setup
First you need do install Clang and NPM, both of which are operating system specific.
<details>
	<summary>Unix</summary>
	On unix installation is quite easy. Just run the two lines below in your terminal
	<pre><code>sudo apt-get npm<br/>sudo apt-get clang++</code></pre>
</details>
<details>
	<summary>Windows</summary>
	First simply install NodeJS from <a href="https://nodejs.dev">nodejs.dev</a>, then you need to install clang. To install Clang one Windows you need to have MSVC installed first - to do this follow this <a href="https://docs.microsoft.com/en-us/cpp/build/vscpp-step-0-installation">guide</a>, then once MSVC is installed you can simply download the pre-built binary for you computer from <a href="https://releases.llvm.org/download.html">here</a>
</details>

Once that is done, simply run these lines in the folder and now all required files are prepared for your system
```
npm install
npm run build
```

## CLI Ussage

Once you have the required files build, you can then compile an executable via:
<details>
	<summary>Unix</summary>
	<code>./compile.bash test/pre-alpha/first-execution.qp</code>
</details>
<details>
	<summary>Windows</summary>
	<code>compile test/pre-alpha/first-execution.qp</code>
</details>

## Flags

| Flag | Description |
| :- | :- |
| ``-S {llvm?}`` | The flag specifies not to build a binary, if optional term ``llvm`` is entered it will only output LLVM-IR, otherwise it will output the assembly of the target platform |
| ``-o {file}`` | Specify the output filename from the compiler |
| ``--no-caching`` | Specifies that the compiler should not reuse values cached in registers, and should instead reload any reference values each time they are used
| ``--execute`` | Specifies that the compiler should not reuse values cached in registers, and should instead reload any reference values each time they are used