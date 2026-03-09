import { TokenType } from '../lexer/token-types.js';
import { Precedence } from './precedence.js';
import * as AST from './ast-nodes.js';

export function parseBinary(precedence, op) {
  return function (parser, left, token) {
    const right = parser.parseExpression(precedence);
    return AST.BinaryExpr(op, left, right);
  };
}

export function parseCall(parser, left, token) {
  const args = [];
  if (!parser.check(TokenType.RPAREN)) {
    do {
      args.push(parser.parseExpression(Precedence.NONE));
    } while (parser.matchToken(TokenType.COMMA));
  }
  parser.expect(TokenType.RPAREN);
  return AST.CallExpr(left, args);
}

export function parseIndex(parser, left, token) {
  const index = parser.parseExpression(Precedence.NONE);
  parser.expect(TokenType.RBRACKET);
  return AST.IndexExpr(left, index);
}

export const INFIX_RULES = {
  [TokenType.PLUS]:    { prec: Precedence.ADDITION,   fn: parseBinary(Precedence.ADDITION, '+') },
  [TokenType.MINUS]:   { prec: Precedence.ADDITION,   fn: parseBinary(Precedence.ADDITION, '-') },
  [TokenType.STAR]:    { prec: Precedence.MULTIPLY,   fn: parseBinary(Precedence.MULTIPLY, '*') },
  [TokenType.SLASH]:   { prec: Precedence.MULTIPLY,   fn: parseBinary(Precedence.MULTIPLY, '/') },
  [TokenType.PERCENT]: { prec: Precedence.MULTIPLY,   fn: parseBinary(Precedence.MULTIPLY, '%') },
  [TokenType.EQ]:      { prec: Precedence.EQUALITY,   fn: parseBinary(Precedence.EQUALITY, '==') },
  [TokenType.NEQ]:     { prec: Precedence.EQUALITY,   fn: parseBinary(Precedence.EQUALITY, '!=') },
  [TokenType.LT]:      { prec: Precedence.COMPARISON, fn: parseBinary(Precedence.COMPARISON, '<') },
  [TokenType.GT]:      { prec: Precedence.COMPARISON, fn: parseBinary(Precedence.COMPARISON, '>') },
  [TokenType.LTE]:     { prec: Precedence.COMPARISON, fn: parseBinary(Precedence.COMPARISON, '<=') },
  [TokenType.GTE]:     { prec: Precedence.COMPARISON, fn: parseBinary(Precedence.COMPARISON, '>=') },
  [TokenType.AND]:     { prec: Precedence.AND,        fn: parseBinary(Precedence.AND, 'and') },
  [TokenType.OR]:      { prec: Precedence.OR,         fn: parseBinary(Precedence.OR, 'or') },
  [TokenType.LPAREN]:  { prec: Precedence.CALL,       fn: parseCall },
  [TokenType.LBRACKET]:{ prec: Precedence.INDEX,      fn: parseIndex },
};
