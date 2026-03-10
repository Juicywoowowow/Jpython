import * as AST from '../../parser/ast-nodes.js';

function isPropagatableConstant(node) {
  return node.type === 'NumberLiteral'
    || node.type === 'StringLiteral'
    || node.type === 'BoolLiteral'
    || node.type === 'NoneLiteral';
}

function cloneConstant(node) {
  switch (node.type) {
    case 'NumberLiteral': return AST.NumberLiteral(node.value, !!node.isFloat);
    case 'StringLiteral': return AST.StringLiteral(node.value);
    case 'BoolLiteral': return AST.BoolLiteral(node.value);
    case 'NoneLiteral': return AST.NoneLiteral();
    default: return node;
  }
}

function exprHasCall(node) {
  switch (node.type) {
    case 'CallExpr':
      return true;
    case 'UnaryExpr':
      return exprHasCall(node.operand);
    case 'BinaryExpr':
      return exprHasCall(node.left) || exprHasCall(node.right);
    case 'ListExpr':
    case 'TupleExpr':
      return node.elements.some(exprHasCall);
    case 'DictExpr':
      return node.entries.some(entry => exprHasCall(entry.key) || exprHasCall(entry.value));
    case 'ListComprehensionExpr':
      return exprHasCall(node.element)
        || node.clauses.some(clause => exprHasCall(clause.iterable) || (clause.condition && exprHasCall(clause.condition)));
    case 'IndexExpr':
      return exprHasCall(node.object) || exprHasCall(node.index);
    case 'SliceExpr':
      return exprHasCall(node.object)
        || (node.start && exprHasCall(node.start))
        || (node.stop && exprHasCall(node.stop))
        || (node.step && exprHasCall(node.step));
    case 'DotExpr':
      return exprHasCall(node.object);
    case 'LambdaExpr':
      return node.defaults.some(exprHasCall) || exprHasCall(node.body);
    default:
      return false;
  }
}

function propagateExpr(node, env) {
  switch (node.type) {
    case 'Identifier':
      return env.has(node.name) ? cloneConstant(env.get(node.name)) : node;
    case 'UnaryExpr':
      return AST.UnaryExpr(node.op, propagateExpr(node.operand, env));
    case 'BinaryExpr':
      return AST.BinaryExpr(node.op, propagateExpr(node.left, env), propagateExpr(node.right, env));
    case 'ListExpr':
      return AST.ListExpr(node.elements.map(element => propagateExpr(element, env)));
    case 'TupleExpr':
      return AST.TupleExpr(node.elements.map(element => propagateExpr(element, env)));
    case 'DictExpr':
      return AST.DictExpr(node.entries.map(entry => ({ key: propagateExpr(entry.key, env), value: propagateExpr(entry.value, env) })));
    case 'ListComprehensionExpr': {
      const innerEnv = new Map(env);
      for (const clause of node.clauses) innerEnv.delete(clause.target);
      return AST.ListComprehensionExpr(
        propagateExpr(node.element, innerEnv),
        node.clauses.map(clause => ({
          target: clause.target,
          iterable: propagateExpr(clause.iterable, env),
          condition: clause.condition ? propagateExpr(clause.condition, innerEnv) : null,
        }))
      );
    }
    case 'IndexExpr':
      return AST.IndexExpr(propagateExpr(node.object, env), propagateExpr(node.index, env));
    case 'SliceExpr':
      return AST.SliceExpr(
        propagateExpr(node.object, env),
        node.start ? propagateExpr(node.start, env) : null,
        node.stop ? propagateExpr(node.stop, env) : null,
        node.step ? propagateExpr(node.step, env) : null
      );
    case 'DotExpr':
      return AST.DotExpr(propagateExpr(node.object, env), node.attr);
    case 'CallExpr':
      return {
        type: 'CallExpr',
        callee: propagateExpr(node.callee, env),
        args: node.args.map(arg => propagateExpr(arg, env)),
        kwargs: node.kwargs.map(arg => ({ type: 'KeywordArg', name: arg.name, value: propagateExpr(arg.value, env) })),
      };
    case 'LambdaExpr':
      return AST.LambdaExpr(node.params, node.defaults.map(expr => propagateExpr(expr, env)), propagateExpr(node.body, new Map()));
    case 'TernaryExpr':
      return AST.TernaryExpr(propagateExpr(node.body, env), propagateExpr(node.condition, env), propagateExpr(node.elseBody, env));
    default:
      return node;
  }
}

function propagateBlock(statements, env) {
  const result = [];
  let currentEnv = new Map(env);

  for (const statement of statements) {
    const propagated = propagateStatement(statement, currentEnv);
    result.push(propagated.statement);
    currentEnv = propagated.env;
  }

  return { statements: result, env: currentEnv };
}

function propagateStatement(node, env) {
  switch (node.type) {
    case 'AssignStmt': {
      const value = propagateExpr(node.value, env);
      const nextEnv = new Map(env);
      if (isPropagatableConstant(value)) nextEnv.set(node.name, cloneConstant(value));
      else nextEnv.delete(node.name);
      return { statement: AST.AssignStmt(node.name, value), env: nextEnv };
    }
    case 'IndexAssignStmt':
      return {
        statement: AST.IndexAssignStmt(propagateExpr(node.object, env), propagateExpr(node.index, env), propagateExpr(node.value, env)),
        env: new Map(env),
      };
    case 'DotAssignStmt':
      return {
        statement: AST.DotAssignStmt(propagateExpr(node.object, env), node.attr, propagateExpr(node.value, env)),
        env: new Map(env),
      };
    case 'TupleUnpackAssignStmt': {
      const values = node.values.map(v => propagateExpr(v, env));
      const nextEnv = new Map(env);
      for (const target of node.targets) {
        if (target.type === 'Identifier') nextEnv.delete(target.name);
      }
      return { statement: AST.TupleUnpackAssignStmt(node.targets, values), env: nextEnv };
    }
    case 'AugAssignStmt': {
      const value = propagateExpr(node.value, env);
      const nextEnv = new Map(env);
      if (node.target.type === 'Identifier') nextEnv.delete(node.target.name);
      return { statement: AST.AugAssignStmt(node.target, node.op, value), env: nextEnv };
    }
    case 'ClassDefStmt': {
      const body = propagateBlock(node.body, new Map()).statements;
      const nextEnv = new Map(env);
      nextEnv.delete(node.name);
      return { statement: AST.ClassDefStmt(node.name, node.bases.map(base => propagateExpr(base, env)), body), env: nextEnv };
    }
    case 'PrintStmt': {
      const args = node.args.map(arg => propagateExpr(arg, env));
      return { statement: AST.PrintStmt(args), env: args.some(exprHasCall) ? new Map() : new Map(env) };
    }
    case 'ExprStmt': {
      const expr = propagateExpr(node.expr, env);
      return { statement: AST.ExprStmt(expr), env: exprHasCall(expr) ? new Map() : new Map(env) };
    }
    case 'IfStmt': {
      const condition = propagateExpr(node.condition, env);
      const body = propagateBlock(node.body, new Map(env)).statements;
      const elifs = node.elifs.map(elif => ({
        condition: propagateExpr(elif.condition, env),
        body: propagateBlock(elif.body, new Map(env)).statements,
      }));
      const elseBody = node.elseBody ? propagateBlock(node.elseBody, new Map(env)).statements : null;
      return { statement: AST.IfStmt(condition, body, elifs, elseBody), env: new Map() };
    }
    case 'WhileStmt':
      return {
        statement: AST.WhileStmt(
          propagateExpr(node.condition, new Map()),
          propagateBlock(node.body, new Map()).statements
        ),
        env: new Map(),
      };
    case 'ForStmt':
      return {
        statement: AST.ForStmt(
          node.target,
          propagateExpr(node.iterable, env),
          propagateBlock(node.body, new Map()).statements
        ),
        env: new Map(),
      };
    case 'FunctionDefStmt': {
      const body = propagateBlock(node.body, new Map()).statements;
      const nextEnv = new Map(env);
      nextEnv.delete(node.name);
      return { statement: AST.FunctionDefStmt(node.name, node.params, node.defaults.map(expr => propagateExpr(expr, env)), body), env: nextEnv };
    }
    case 'ReturnStmt':
      return { statement: AST.ReturnStmt(node.value ? propagateExpr(node.value, env) : null), env: new Map() };
    case 'TryStmt':
      return {
        statement: AST.TryStmt(
          propagateBlock(node.body, new Map(env)).statements,
          node.handlers.map(handler => ({
            type: handler.type ? propagateExpr(handler.type, env) : null,
            alias: handler.alias,
            body: propagateBlock(handler.body, new Map(env)).statements,
          })),
          node.finallyBody ? propagateBlock(node.finallyBody, new Map(env)).statements : null
        ),
        env: new Map(),
      };
    case 'RaiseStmt':
      return { statement: AST.RaiseStmt(node.value ? propagateExpr(node.value, env) : null), env: new Map() };
    case 'WithStmt':
      return {
        statement: AST.WithStmt(propagateExpr(node.context, env), node.alias, propagateBlock(node.body, new Map(env)).statements),
        env: new Map(),
      };
    default:
      return { statement: node, env: new Map(env) };
  }
}

export function propagateConstants(ast) {
  return AST.Program(propagateBlock(ast.body, new Map()).statements);
}