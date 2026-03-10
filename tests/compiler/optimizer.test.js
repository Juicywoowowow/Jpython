import { describe, expect, it } from 'vitest';

import { compileSource } from '../../src/index.js';
import { Op } from '../../src/compiler/opcodes.js';

function opcodes(bytecode) {
  return bytecode.instructions.map(instruction => instruction.op);
}

function loadVarNames(bytecode) {
  return bytecode.instructions
    .filter(instruction => instruction.op === Op.LOAD_VAR)
    .map(instruction => bytecode.names[instruction.args[1]]);
}

function hasConstant(bytecode, predicate) {
  return bytecode.constants.some(predicate);
}

function findCodeConstant(bytecode, name) {
  return bytecode.constants.find(constant => constant?.kind === 'code' && constant.name === name);
}

describe('optimizer', () => {
  it('folds literal arithmetic chains into a single constant', () => {
    const bytecode = compileSource('print(2 + 3 * 4)\n');

    expect(opcodes(bytecode)).not.toContain(Op.MUL);
    expect(opcodes(bytecode)).not.toContain(Op.ADD);
    expect(hasConstant(bytecode, constant => constant?.type === 'int' && constant.value === 14)).toBe(true);
  });

  it('folds pure string expressions', () => {
    const bytecode = compileSource('print("a" * 3 + "b")\n');

    expect(opcodes(bytecode)).not.toContain(Op.MUL);
    expect(opcodes(bytecode)).not.toContain(Op.ADD);
    expect(hasConstant(bytecode, constant => constant?.type === 'str' && constant.value === 'aaab')).toBe(true);
  });

  it('preserves float results when folding division', () => {
    const bytecode = compileSource('print(10 / 2)\n');

    expect(opcodes(bytecode)).not.toContain(Op.DIV);
    expect(hasConstant(bytecode, constant => constant?.type === 'float' && constant.value === 5)).toBe(true);
  });

  it('propagates scalar constants into later expressions', () => {
    const bytecode = compileSource('x = 2\ny = x + 3\nprint(y)\n');

    expect(opcodes(bytecode)).not.toContain(Op.ADD);
    expect(loadVarNames(bytecode)).toEqual(['y']);
    expect(hasConstant(bytecode, constant => constant?.type === 'int' && constant.value === 5)).toBe(true);
  });

  it('stops propagation across call boundaries', () => {
    const bytecode = compileSource('x = 2\nfoo()\nprint(x)\n');

    expect(loadVarNames(bytecode)).toContain('foo');
    expect(loadVarNames(bytecode)).toContain('x');
  });

  it('optimizes nested function bodies', () => {
    const bytecode = compileSource('def f():\n    x = 2\n    return x + 3\n');
    const codeObject = findCodeConstant(bytecode, 'f');

    expect(codeObject).toBeTruthy();
    expect(opcodes(codeObject.bytecode)).not.toContain(Op.ADD);
    expect(hasConstant(codeObject.bytecode, constant => constant?.type === 'int' && constant.value === 5)).toBe(true);
  });

  it('does not propagate through conditional control flow joins', () => {
    const bytecode = compileSource('x = 2\nif True:\n    x = 3\nprint(x)\n');

    expect(loadVarNames(bytecode)).toContain('x');
  });

  it('does not freeze while-loop conditions from pre-loop constants', () => {
    const bytecode = compileSource('i = 0\nwhile i < 2:\n    i = i + 1\n');

    expect(loadVarNames(bytecode)).toContain('i');
    expect(hasConstant(bytecode, constant => constant?.type === 'bool' && constant.value === true)).toBe(false);
  });
});