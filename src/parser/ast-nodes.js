// Expressions
export function NumberLiteral(value) {
  return { type: 'NumberLiteral', value };
}

export function StringLiteral(value) {
  return { type: 'StringLiteral', value };
}

export function BoolLiteral(value) {
  return { type: 'BoolLiteral', value };
}

export function NoneLiteral() {
  return { type: 'NoneLiteral' };
}

export function Identifier(name) {
  return { type: 'Identifier', name };
}

export function UnaryExpr(op, operand) {
  return { type: 'UnaryExpr', op, operand };
}

export function BinaryExpr(op, left, right) {
  return { type: 'BinaryExpr', op, left, right };
}

export function ListExpr(elements) {
  return { type: 'ListExpr', elements };
}

export function ListComprehensionExpr(element, clauses) {
  return { type: 'ListComprehensionExpr', element, clauses };
}

export function TupleExpr(elements) {
  return { type: 'TupleExpr', elements };
}

export function DictExpr(entries) {
  return { type: 'DictExpr', entries };
}

export function IndexExpr(object, index) {
  return { type: 'IndexExpr', object, index };
}

export function SliceExpr(object, start, stop, step) {
  return { type: 'SliceExpr', object, start, stop, step };
}

export function DotExpr(object, attr) {
  return { type: 'DotExpr', object, attr };
}

export function CallExpr(callee, args) {
  return { type: 'CallExpr', callee, args: args || [], kwargs: [] };
}

export function KeywordArg(name, value) {
  return { type: 'KeywordArg', name, value };
}

export function CallExprWithKeywords(callee, args, kwargs) {
  return { type: 'CallExpr', callee, args: args || [], kwargs: kwargs || [] };
}

export function LambdaExpr(params, defaults, body) {
  return { type: 'LambdaExpr', params: params || [], defaults: defaults || [], body };
}

// Statements
export function AssignStmt(name, value) {
  return { type: 'AssignStmt', name, value };
}

export function IndexAssignStmt(object, index, value) {
  return { type: 'IndexAssignStmt', object, index, value };
}

export function DotAssignStmt(object, attr, value) {
  return { type: 'DotAssignStmt', object, attr, value };
}

export function ClassDefStmt(name, bases, body) {
  return { type: 'ClassDefStmt', name, bases: bases || [], body };
}

export function PassStmt() {
  return { type: 'PassStmt' };
}

export function PrintStmt(args) {
  return { type: 'PrintStmt', args };
}

export function ExprStmt(expr) {
  return { type: 'ExprStmt', expr };
}

export function IfStmt(condition, body, elifs, elseBody) {
  return { type: 'IfStmt', condition, body, elifs: elifs || [], elseBody: elseBody || null };
}

export function WhileStmt(condition, body) {
  return { type: 'WhileStmt', condition, body };
}

export function ForStmt(target, iterable, body) {
  return { type: 'ForStmt', target, iterable, body };
}

export function FunctionDefStmt(name, params, defaults, body) {
  return { type: 'FunctionDefStmt', name, params, defaults, body };
}

export function ReturnStmt(value = null) {
  return { type: 'ReturnStmt', value };
}

export function GlobalStmt(names) {
  return { type: 'GlobalStmt', names };
}

export function NonlocalStmt(names) {
  return { type: 'NonlocalStmt', names };
}

export function BreakStmt() {
  return { type: 'BreakStmt' };
}

export function ContinueStmt() {
  return { type: 'ContinueStmt' };
}

export function Block(statements) {
  return { type: 'Block', statements };
}

export function Program(body) {
  return { type: 'Program', body };
}
