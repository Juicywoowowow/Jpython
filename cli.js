#!/usr/bin/env node

import { compileSource, createRuntime, executeInRuntime, run } from './src/index.js';
import { disassemble } from './src/compiler/disassembler.js';
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const supportedFlags = new Set(['--disassemble']);
const flags = args.filter(arg => arg.startsWith('-'));
const unknownFlag = flags.find(flag => !supportedFlags.has(flag));
const filenames = args.filter(arg => !arg.startsWith('-'));
const shouldDisassemble = flags.includes('--disassemble');

if (unknownFlag) {
  console.error(`jpython: unknown option '${unknownFlag}'`);
  process.exit(1);
}

if (shouldDisassemble && filenames.length === 0) {
  console.error('jpython: --disassemble requires a file path');
  process.exit(1);
}

if (filenames.length > 0) {
  // File mode
  const filename = filenames[0];
  try {
    const source = readFileSync(filename, 'utf-8');
    if (shouldDisassemble) {
      const bytecode = compileSource(source);
      console.log(disassemble(bytecode));
    } else {
      run(source);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`jpython: can't open file '${filename}': No such file or directory`);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
} else {
  // REPL mode
  console.log('JPython 1.0.0 REPL');
  console.log('Type your Python code. Press Ctrl+C to exit.\n');

  const replVm = createRuntime();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>>> ',
  });

  rl.prompt();

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    try {
      executeInRuntime(trimmed, replVm);
    } catch (err) {
      console.error(err.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nBye!');
    process.exit(0);
  });
}
