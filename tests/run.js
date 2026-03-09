#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { run } from '../src/index.js';
import { OutputCapture } from '../src/runtime/output.js';

const TESTS_DIR = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

let passed = 0;
let failed = 0;
const failures = [];

function collectTests(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectTests(full));
    } else if (entry.name.endsWith('.py')) {
      files.push(full);
    }
  }
  return files;
}

function parseExpected(source) {
  const lines = [];
  for (const line of source.split('\n')) {
    const match = line.match(/^#\s*expect:\s*(.*)$/);
    if (match) lines.push(match[1]);
  }
  return lines;
}

function parseExpectError(source) {
  for (const line of source.split('\n')) {
    const match = line.match(/^#\s*expect_error:\s*(.*)$/);
    if (match) return match[1];
  }
  return null;
}

const testFiles = collectTests(TESTS_DIR).sort();

console.log(`\nJPython Test Runner`);
console.log(`===================\n`);
console.log(`Found ${testFiles.length} test files\n`);

for (const file of testFiles) {
  const rel = relative(TESTS_DIR, file);
  const source = readFileSync(file, 'utf-8');
  const expectedLines = parseExpected(source);
  const expectedError = parseExpectError(source);

  try {
    const output = new OutputCapture();
    run(source, output);
    const actual = output.getLines();

    if (expectedError) {
      failed++;
      failures.push({ file: rel, reason: `Expected error "${expectedError}" but ran successfully` });
      console.log(`  FAIL  ${rel}`);
      continue;
    }

    if (expectedLines.length === 0) {
      passed++;
      console.log(`  PASS  ${rel} (no assertions, ran without error)`);
      continue;
    }

    let ok = true;
    const mismatches = [];
    for (let i = 0; i < Math.max(expectedLines.length, actual.length); i++) {
      const exp = expectedLines[i] ?? '(missing)';
      const act = actual[i] ?? '(missing)';
      if (exp !== act) {
        ok = false;
        mismatches.push(`    line ${i + 1}: expected "${exp}" got "${act}"`);
      }
    }

    if (ok) {
      passed++;
      console.log(`  PASS  ${rel}`);
    } else {
      failed++;
      failures.push({ file: rel, reason: mismatches.join('\n') });
      console.log(`  FAIL  ${rel}`);
    }
  } catch (err) {
    if (expectedError) {
      if (err.message.includes(expectedError)) {
        passed++;
        console.log(`  PASS  ${rel} (expected error)`);
      } else {
        failed++;
        failures.push({ file: rel, reason: `Expected error "${expectedError}" but got "${err.message}"` });
        console.log(`  FAIL  ${rel}`);
      }
    } else {
      failed++;
      failures.push({ file: rel, reason: err.message });
      console.log(`  FAIL  ${rel}`);
    }
  }
}

if (failures.length > 0) {
  console.log(`\n--- Failures ---\n`);
  for (const f of failures) {
    console.log(`${f.file}:`);
    console.log(`  ${f.reason}\n`);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
process.exit(failed > 0 ? 1 : 0);
