import { TokenType } from '../lexer/token-types.js';
import { Precedence } from './precedence.js';
import * as AST from './ast-nodes.js';

export function parseNumber(parser, token) {
  const val = token.value.includes('.') ? parseFloat(token.value) : parseInt(token.value, 10);
  return AST.NumberLiteral(val);
}

export function parseString(parser, token) {
  return AST.StringLiteral(token.value);
}

export function parseTrue(parser, token) {
  return AST.BoolLiteral(true);
}

export function parseFalse(parser, token) {
  return AST.BoolLiteral(false);
}

export function parseNone(parser, token) {
  return AST.NoneLiteral();
}

export function parseIdentifier(parser, token) {
  return AST.Identifier(token.value);
}

export function parseUnaryMinus(parser, token) {
  const operand = parser.parseExpression(Precedence.UNARY);
  return AST.UnaryExpr('-', operand);
}

export function parseNot(parser, token) {
  const operand = parser.parseExpression(Precedence.NOT);
  return AST.UnaryExpr('not', operand);
}

export function parseGrouping(parser, token) {
  const expr = parser.parseExpression(Precedence.NONE);
  parser.expect(TokenType.RPAREN);
  return expr;
}

export function parseList(parser, token) {
  const elements = [];
  if (!parser.check(TokenType.RBRACKET)) {
    do {
      elements.push(parser.parseExpression(Precedence.NONE));
    } while (parser.matchToken(TokenType.COMMA));
  }
  parser.expect(TokenType.RBRACKET);
  return AST.ListExpr(elements);
}
