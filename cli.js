#!/usr/bin/env node

import { run } from './src/index.js';
import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);

if (args.length > 0) {
  // File mode
  const filename = args[0];
  try {
    const source = readFileSync(filename, 'utf-8');
    run(source);
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
      run(trimmed);
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
