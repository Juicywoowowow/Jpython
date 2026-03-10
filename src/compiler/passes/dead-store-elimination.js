import * as AST from '../../parser/ast-nodes.js';

function isPureLiteralValue(node) {
  switch (node.type) {
    case 'NumberLiteral':
    case 'StringLiteral':
    case 'BoolLiteral':
    case 'NoneLiteral':
      return true;
    case 'ListExpr':
    case 'TupleExpr':
      return node.elements.every(isPureLiteralValue);
    case 'DictExpr':
      return node.entries.every(entry => isPureLiteralValue(entry.key) && isPureLiteralValue(entry.value));
    default:
      return false;
  }
}

function addExprReads(node, reads) {
  switch (node.type) {
    case 'Identifier':
      reads.add(node.name);
      break;
    case 'UnaryExpr':
      addExprReads(node.operand, reads);
      break;
    case 'BinaryExpr':
      addExprReads(node.left, reads);
      addExprReads(node.right, reads);
      break;
    case 'ListExpr':
    case 'TupleExpr':
      for (const element of node.elements) addExprReads(element, reads);
      break;
    case 'DictExpr':
      for (const entry of node.entries) {
        addExprReads(entry.key, reads);
        addExprReads(entry.value, reads);
      }
      break;
    case 'ListComprehensionExpr':
      addExprReads(node.element, reads);
      for (const clause of node.clauses) {
        addExprReads(clause.iterable, reads);
        if (clause.condition) addExprReads(clause.condition, reads);
      }
      break;
    case 'IndexExpr':
      addExprReads(node.object, reads);
      addExprReads(node.index, reads);
      break;
    case 'SliceExpr':
      addExprReads(node.object, reads);
      if (node.start) addExprReads(node.start, reads);
      if (node.stop) addExprReads(node.stop, reads);
      if (node.step) addExprReads(node.step, reads);
      break;
    case 'DotExpr':
      addExprReads(node.object, reads);
      break;
    case 'CallExpr':
      addExprReads(node.callee, reads);
      for (const arg of node.args) addExprReads(arg, reads);
      for (const kwarg of node.kwargs) addExprReads(kwarg.value, reads);
      break;
    case 'LambdaExpr':
      for (const expr of node.defaults) addExprReads(expr, reads);
      addExprReads(node.body, reads);
      break;
    case 'TernaryExpr':
      addExprReads(node.body, reads);
      addExprReads(node.condition, reads);
      addExprReads(node.elseBody, reads);
      break;
    default:
      break;
  }
}

function collectStatementReads(node, reads) {
  switch (node.type) {
    case 'AssignStmt':
      addExprReads(node.value, reads);
      break;
    case 'IndexAssignStmt':
      addExprReads(node.object, reads);
      addExprReads(node.index, reads);
      addExprReads(node.value, reads);
      break;
    case 'DotAssignStmt':
      addExprReads(node.object, reads);
      addExprReads(node.value, reads);
      break;
    case 'TupleUnpackAssignStmt':
      for (const target of node.targets) {
        if (target.type === 'IndexExpr') {
          addExprReads(target.object, reads);
          addExprReads(target.index, reads);
        } else if (target.type === 'DotExpr') {
          addExprReads(target.object, reads);
        }
      }
      for (const value of node.values) addExprReads(value, reads);
      break;
    case 'AugAssignStmt':
      addExprReads(node.target, reads);
      addExprReads(node.value, reads);
      break;
    case 'ClassDefStmt':
      for (const base of node.bases) addExprReads(base, reads);
      for (const stmt of node.body) collectStatementReads(stmt, reads);
      break;
    case 'PrintStmt':
      for (const arg of node.args) addExprReads(arg, reads);
      break;
    case 'ExprStmt':
      addExprReads(node.expr, reads);
      break;
    case 'IfStmt':
      addExprReads(node.condition, reads);
      for (const stmt of node.body) collectStatementReads(stmt, reads);
      for (const elif of node.elifs) {
        addExprReads(elif.condition, reads);
        for (const stmt of elif.body) collectStatementReads(stmt, reads);
      }
      if (node.elseBody) {
        for (const stmt of node.elseBody) collectStatementReads(stmt, reads);
      }
      break;
    case 'WhileStmt':
      addExprReads(node.condition, reads);
      for (const stmt of node.body) collectStatementReads(stmt, reads);
      break;
    case 'ForStmt':
      addExprReads(node.iterable, reads);
      for (const stmt of node.body) collectStatementReads(stmt, reads);
      break;
    case 'FunctionDefStmt':
      for (const expr of node.defaults) addExprReads(expr, reads);
      for (const stmt of node.body) collectStatementReads(stmt, reads);
      break;
    case 'ReturnStmt':
    case 'RaiseStmt':
      if (node.value) addExprReads(node.value, reads);
      break;
    case 'TryStmt':
      for (const stmt of node.body) collectStatementReads(stmt, reads);
      for (const handler of node.handlers) {
        if (handler.type) addExprReads(handler.type, reads);
        for (const stmt of handler.body) collectStatementReads(stmt, reads);
      }
      if (node.finallyBody) {
        for (const stmt of node.finallyBody) collectStatementReads(stmt, reads);
      }
      break;
    case 'WithStmt':
      addExprReads(node.context, reads);
      for (const stmt of node.body) collectStatementReads(stmt, reads);
      break;
    default:
      break;
  }
}

function optimizeNestedStatement(node, parentContext = 'module', isRepl = false) {
  const nestedBlockContext = parentContext === 'class' ? 'class' : 'block';

  switch (node.type) {
    case 'ClassDefStmt':
      return AST.ClassDefStmt(node.name, node.bases, eliminateDeadStoresInBlock(node.body, 'class', isRepl));
    case 'IfStmt':
      return AST.IfStmt(
        node.condition,
        eliminateDeadStoresInBlock(node.body, nestedBlockContext, isRepl),
        node.elifs.map(elif => ({ condition: elif.condition, body: eliminateDeadStoresInBlock(elif.body, nestedBlockContext, isRepl) })),
        node.elseBody ? eliminateDeadStoresInBlock(node.elseBody, nestedBlockContext, isRepl) : null
      );
    case 'WhileStmt':
      return AST.WhileStmt(node.condition, eliminateDeadStoresInBlock(node.body, nestedBlockContext, isRepl));
    case 'ForStmt':
      return AST.ForStmt(node.target, node.iterable, eliminateDeadStoresInBlock(node.body, nestedBlockContext, isRepl));
    case 'FunctionDefStmt':
      return AST.FunctionDefStmt(node.name, node.params, node.defaults, eliminateDeadStoresInBlock(node.body, 'function'));
    case 'TryStmt':
      return AST.TryStmt(
        eliminateDeadStoresInBlock(node.body, nestedBlockContext, isRepl),
        node.handlers.map(handler => ({
          type: handler.type,
          alias: handler.alias,
          body: eliminateDeadStoresInBlock(handler.body, nestedBlockContext, isRepl),
        })),
        node.finallyBody ? eliminateDeadStoresInBlock(node.finallyBody, nestedBlockContext, isRepl) : null
      );
    case 'WithStmt':
      return AST.WithStmt(node.context, node.alias, eliminateDeadStoresInBlock(node.body, nestedBlockContext, isRepl));
    default:
      return node;
  }
}

function collectProtectedNames(statements) {
  const protectedNames = new Set();
  for (const statement of statements) {
    if (statement.type === 'GlobalStmt' || statement.type === 'NonlocalStmt') {
      for (const name of statement.names) protectedNames.add(name);
    }
  }
  return protectedNames;
}

function collectBlockReads(statements) {
  const reads = new Set();
  for (const statement of statements) {
    collectStatementReads(statement, reads);
  }
  return reads;
}

function eliminateDeadStoresInBlock(statements, context = 'module', isRepl = false) {
  const protectedNames = collectProtectedNames(statements);
  const blockReads = context === 'function' ? collectBlockReads(statements) : new Set();
  const skipElimination = isRepl && context === 'module';
  const live = new Set();
  const kept = [];

  for (let i = statements.length - 1; i >= 0; i--) {
    const statement = optimizeNestedStatement(statements[i], context, isRepl);

    if (
      !skipElimination
      && context !== 'class'
      && context !== 'block'
      &&
      statement.type === 'AssignStmt'
      && !protectedNames.has(statement.name)
      && !blockReads.has(statement.name)
      && !live.has(statement.name)
      && isPureLiteralValue(statement.value)
    ) {
      continue;
    }

    kept.push(statement);

    if (statement.type === 'AssignStmt') {
      live.delete(statement.name);
      addExprReads(statement.value, live);
      continue;
    }

    if (statement.type === 'TupleUnpackAssignStmt') {
      for (const target of statement.targets) {
        if (target.type === 'Identifier') live.delete(target.name);
      }
      collectStatementReads(statement, live);
      continue;
    }

    if (statement.type === 'AugAssignStmt') {
      collectStatementReads(statement, live);
      continue;
    }

    if (statement.type === 'FunctionDefStmt' || statement.type === 'ClassDefStmt') {
      live.delete(statement.name);
    }

    collectStatementReads(statement, live);
  }

  return kept.reverse();
}

export function eliminateDeadStores(ast, { isRepl = false } = {}) {
  return AST.Program(eliminateDeadStoresInBlock(ast.body, 'module', isRepl));
}