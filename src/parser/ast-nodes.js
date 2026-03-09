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

export function IndexExpr(object, index) {
  return { type: 'IndexExpr', object, index };
}

export function CallExpr(callee, args) {
  return { type: 'CallExpr', callee, args };
}

// Statements
export function AssignStmt(name, value) {
  return { type: 'AssignStmt', name, value };
}

export function IndexAssignStmt(object, index, value) {
  return { type: 'IndexAssignStmt', object, index, value };
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

export function Block(statements) {
  return { type: 'Block', statements };
}

export function Program(body) {
  return { type: 'Program', body };
}
