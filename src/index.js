import { Lexer } from './lexer/lexer.js';
import { Parser } from './parser/parser.js';
import { Compiler } from './compiler/compiler.js';
import { VM } from './vm/vm.js';
import { createBuiltins } from './runtime/builtins.js';

export function run(source, output) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parse();

  const compiler = new Compiler();
  const bytecode = compiler.compile(ast);

  const vm = new VM(output);

  // Install builtins into the VM environment
  const builtins = createBuiltins();
  for (const [name, fn] of Object.entries(builtins)) {
    vm.env.set(name, fn);
  }

  vm.run(bytecode);
  return vm;
}

export { Lexer } from './lexer/lexer.js';
export { Parser } from './parser/parser.js';
export { Compiler } from './compiler/compiler.js';
export { VM } from './vm/vm.js';
