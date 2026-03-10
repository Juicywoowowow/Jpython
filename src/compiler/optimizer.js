import { foldConstants } from './passes/constant-folding.js';
import { eliminateDeadStores } from './passes/dead-store-elimination.js';
import { propagateConstants } from './passes/constant-propagation.js';

export function optimizeAst(ast, { isRepl = false } = {}) {
  let optimized = ast;
  optimized = foldConstants(optimized);
  optimized = propagateConstants(optimized);
  optimized = foldConstants(optimized);
  optimized = eliminateDeadStores(optimized, { isRepl });
  return optimized;
}