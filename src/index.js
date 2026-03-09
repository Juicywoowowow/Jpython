import { Lexer } from './lexer/lexer.js';
import { Parser } from './parser/parser.js';
import { Compiler } from './compiler/compiler.js';
import { VM } from './vm/vm.js';
import { createBuiltins } from './runtime/builtins.js';

export function compileSource(source) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parse();

  const compiler = new Compiler();
  return compiler.compile(ast);
}

export function createRuntime(output) {
  const vm = new VM(output);

  const builtins = createBuiltins();
  for (const [name, fn] of Object.entries(builtins)) {
    vm.env.set(name, fn);
  }

  return vm;
}

export function executeInRuntime(source, vm) {
  const bytecode = compileSource(source);
  vm.run(bytecode);
  return vm;
}

export function run(source, output) {
  const vm = createRuntime(output);
  return executeInRuntime(source, vm);
}

export { Lexer } from './lexer/lexer.js';
export { Parser } from './parser/parser.js';
export { Compiler } from './compiler/compiler.js';
export { VM } from './vm/vm.js';
