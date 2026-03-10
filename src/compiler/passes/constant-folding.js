import * as AST from '../../parser/ast-nodes.js';

function isScalarLiteral(node) {
  return node.type === 'NumberLiteral'
    || node.type === 'StringLiteral'
    || node.type === 'BoolLiteral'
    || node.type === 'NoneLiteral';
}

function isPureLiteral(node) {
  if (isScalarLiteral(node)) return true;
  if (node.type === 'ListExpr' || node.type === 'TupleExpr') {
    return node.elements.every(isPureLiteral);
  }
  if (node.type === 'DictExpr') {
    return node.entries.every(entry => isPureLiteral(entry.key) && isPureLiteral(entry.value));
  }
  return false;
}

function literalTruthy(node) {
  switch (node.type) {
    case 'NumberLiteral': return node.value !== 0;
    case 'StringLiteral': return node.value.length > 0;
    case 'BoolLiteral': return node.value;
    case 'NoneLiteral': return false;
    case 'ListExpr': return node.elements.length > 0;
    case 'TupleExpr': return node.elements.length > 0;
    case 'DictExpr': return node.entries.length > 0;
    default: return true;
  }
}

function isNumericLiteral(node) {
  return node.type === 'NumberLiteral' || node.type === 'BoolLiteral';
}

function numericValue(node) {
  return node.type === 'BoolLiteral' ? (node.value ? 1 : 0) : node.value;
}

function isFloatNumericLiteral(node) {
  return node.type === 'NumberLiteral' && !!node.isFloat;
}

function numericLiteral(value, isFloat = false) {
  return AST.NumberLiteral(value, isFloat);
}

function foldEquality(left, right) {
  if (left.type === 'NoneLiteral' || right.type === 'NoneLiteral') {
    return left.type === right.type;
  }
  if (left.type === 'StringLiteral' && right.type === 'StringLiteral') {
    return left.value === right.value;
  }
  if (left.type === 'BoolLiteral' && right.type === 'BoolLiteral') {
    return left.value === right.value;
  }
  if (isNumericLiteral(left) && isNumericLiteral(right)) {
    return numericValue(left) === numericValue(right);
  }
  return null;
}

function tryFoldBinary(op, left, right) {
  try {
    if (op === 'and' && isPureLiteral(left) && isPureLiteral(right)) {
      return literalTruthy(left) ? right : left;
    }
    if (op === 'or' && isPureLiteral(left) && isPureLiteral(right)) {
      return literalTruthy(left) ? left : right;
    }

    if (isNumericLiteral(left) && isNumericLiteral(right)) {
      const l = numericValue(left);
      const r = numericValue(right);
      const resultIsFloat = isFloatNumericLiteral(left) || isFloatNumericLiteral(right);
      switch (op) {
        case '+': return numericLiteral(l + r, resultIsFloat);
        case '-': return numericLiteral(l - r, resultIsFloat);
        case '*': return numericLiteral(l * r, resultIsFloat);
        case '/': return r === 0 ? null : numericLiteral(l / r, true);
        case '%': return r === 0 ? null : numericLiteral(((l % r) + r) % r, resultIsFloat);
        case '//': return r === 0 ? null : numericLiteral(Math.floor(l / r), resultIsFloat);
        case '**': return numericLiteral(l ** r, resultIsFloat);
        case '<': return AST.BoolLiteral(l < r);
        case '>': return AST.BoolLiteral(l > r);
        case '<=': return AST.BoolLiteral(l <= r);
        case '>=': return AST.BoolLiteral(l >= r);
      }
    }

    if (op === '+' && left.type === 'StringLiteral' && right.type === 'StringLiteral') {
      return AST.StringLiteral(left.value + right.value);
    }

    if (op === '*' && left.type === 'StringLiteral' && isNumericLiteral(right)) {
      const count = Math.trunc(numericValue(right));
      return AST.StringLiteral(count <= 0 ? '' : left.value.repeat(count));
    }

    if (op === '*' && isNumericLiteral(left) && right.type === 'StringLiteral') {
      const count = Math.trunc(numericValue(left));
      return AST.StringLiteral(count <= 0 ? '' : right.value.repeat(count));
    }

    if (op === '==' || op === '!=') {
      const equal = foldEquality(left, right);
      if (equal !== null) {
        return AST.BoolLiteral(op === '==' ? equal : !equal);
      }
    }
  } catch {
    return null;
  }

  return null;
}

function foldExpr(node) {
  switch (node.type) {
    case 'NumberLiteral':
    case 'StringLiteral':
    case 'BoolLiteral':
    case 'NoneLiteral':
    case 'Identifier':
      return node;
    case 'UnaryExpr': {
      const operand = foldExpr(node.operand);
      if (node.op === '-' && operand.type === 'NumberLiteral') {
        return numericLiteral(-operand.value, !!operand.isFloat);
      }
      if (node.op === 'not' && isPureLiteral(operand)) {
        return AST.BoolLiteral(!literalTruthy(operand));
      }
      return AST.UnaryExpr(node.op, operand);
    }
    case 'BinaryExpr': {
      const left = foldExpr(node.left);
      const right = foldExpr(node.right);
      return tryFoldBinary(node.op, left, right) ?? AST.BinaryExpr(node.op, left, right);
    }
    case 'ListExpr':
      return AST.ListExpr(node.elements.map(foldExpr));
    case 'TupleExpr':
      return AST.TupleExpr(node.elements.map(foldExpr));
    case 'DictExpr':
      return AST.DictExpr(node.entries.map(entry => ({ key: foldExpr(entry.key), value: foldExpr(entry.value) })));
    case 'ListComprehensionExpr':
      return AST.ListComprehensionExpr(
        foldExpr(node.element),
        node.clauses.map(clause => ({
          target: clause.target,
          iterable: foldExpr(clause.iterable),
          condition: clause.condition ? foldExpr(clause.condition) : null,
        }))
      );
    case 'IndexExpr':
      return AST.IndexExpr(foldExpr(node.object), foldExpr(node.index));
    case 'SliceExpr':
      return AST.SliceExpr(
        foldExpr(node.object),
        node.start ? foldExpr(node.start) : null,
        node.stop ? foldExpr(node.stop) : null,
        node.step ? foldExpr(node.step) : null
      );
    case 'DotExpr':
      return AST.DotExpr(foldExpr(node.object), node.attr);
    case 'CallExpr':
      return {
        type: 'CallExpr',
        callee: foldExpr(node.callee),
        args: node.args.map(foldExpr),
        kwargs: node.kwargs.map(arg => ({ type: 'KeywordArg', name: arg.name, value: foldExpr(arg.value) })),
      };
    case 'LambdaExpr':
      return AST.LambdaExpr(node.params, node.defaults.map(foldExpr), foldExpr(node.body));
    case 'TernaryExpr': {
      const cond = foldExpr(node.condition);
      const body = foldExpr(node.body);
      const elseBody = foldExpr(node.elseBody);
      if (isPureLiteral(cond)) {
        return literalTruthy(cond) ? body : elseBody;
      }
      return AST.TernaryExpr(body, cond, elseBody);
    }
    default:
      return node;
  }
}

function foldStatements(statements) {
  return statements.map(foldStatement);
}

function foldStatement(node) {
  switch (node.type) {
    case 'AssignStmt':
      return AST.AssignStmt(node.name, foldExpr(node.value));
    case 'IndexAssignStmt':
      return AST.IndexAssignStmt(foldExpr(node.object), foldExpr(node.index), foldExpr(node.value));
    case 'AugAssignStmt':
      return AST.AugAssignStmt(foldExpr(node.target), node.op, foldExpr(node.value));
    case 'DotAssignStmt':
      return AST.DotAssignStmt(foldExpr(node.object), node.attr, foldExpr(node.value));
    case 'ClassDefStmt':
      return AST.ClassDefStmt(node.name, node.bases.map(foldExpr), foldStatements(node.body));
    case 'PrintStmt':
      return AST.PrintStmt(node.args.map(foldExpr));
    case 'ExprStmt':
      return AST.ExprStmt(foldExpr(node.expr));
    case 'IfStmt':
      return AST.IfStmt(
        foldExpr(node.condition),
        foldStatements(node.body),
        node.elifs.map(elif => ({ condition: foldExpr(elif.condition), body: foldStatements(elif.body) })),
        node.elseBody ? foldStatements(node.elseBody) : null
      );
    case 'WhileStmt':
      return AST.WhileStmt(foldExpr(node.condition), foldStatements(node.body));
    case 'ForStmt':
      return AST.ForStmt(node.target, foldExpr(node.iterable), foldStatements(node.body));
    case 'FunctionDefStmt':
      return AST.FunctionDefStmt(node.name, node.params, node.defaults.map(foldExpr), foldStatements(node.body));
    case 'ReturnStmt':
      return AST.ReturnStmt(node.value ? foldExpr(node.value) : null);
    case 'TryStmt':
      return AST.TryStmt(
        foldStatements(node.body),
        node.handlers.map(handler => ({
          type: handler.type ? foldExpr(handler.type) : null,
          alias: handler.alias,
          body: foldStatements(handler.body),
        })),
        node.finallyBody ? foldStatements(node.finallyBody) : null
      );
    case 'RaiseStmt':
      return AST.RaiseStmt(node.value ? foldExpr(node.value) : null);
    case 'WithStmt':
      return AST.WithStmt(foldExpr(node.context), node.alias, foldStatements(node.body));
    default:
      return node;
  }
}

export function foldConstants(ast) {
  return AST.Program(foldStatements(ast.body));
}