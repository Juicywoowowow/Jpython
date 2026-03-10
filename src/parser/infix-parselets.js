import { TokenType } from '../lexer/token-types.js';
import { Precedence } from './precedence.js';
import * as AST from './ast-nodes.js';

export function parseBinary(precedence, op) {
  return function (parser, left, token) {
    const right = parser.parseExpression(precedence);
    return AST.BinaryExpr(op, left, right);
  };
}

export function parseNotIn(parser, left, token) {
  parser.expect(TokenType.IN);
  const right = parser.parseExpression(Precedence.COMPARISON);
  return AST.BinaryExpr('not in', left, right);
}

export function parseCall(parser, left, token) {
  const args = [];
  const kwargs = [];
  const seenKeywords = new Set();
  let sawKeyword = false;

  if (!parser.check(TokenType.RPAREN)) {
    do {
      if (parser.check(TokenType.IDENTIFIER) && parser.peekNext().type === TokenType.ASSIGN) {
        sawKeyword = true;
        const name = parser.advance().value;
        parser.expect(TokenType.ASSIGN);
        if (seenKeywords.has(name)) {
          throw new SyntaxError(`SyntaxError: keyword argument repeated: ${name}`);
        }
        seenKeywords.add(name);
        kwargs.push(AST.KeywordArg(name, parser.parseExpression(Precedence.NONE)));
      } else {
        if (sawKeyword) {
          throw new SyntaxError('SyntaxError: positional argument follows keyword argument');
        }
        args.push(parser.parseExpression(Precedence.NONE));
      }
    } while (parser.matchToken(TokenType.COMMA));
  }
  parser.expect(TokenType.RPAREN);
  return AST.CallExprWithKeywords(left, args, kwargs);
}

export function parseIndex(parser, left, token) {
  // Check for slice: [start:stop:step]
  if (parser.check(TokenType.COLON)) {
    // [::...] or [:stop:...]
    parser.advance();
    let start = null;
    let stop = null;
    let step = null;

    if (!parser.check(TokenType.COLON) && !parser.check(TokenType.RBRACKET)) {
      stop = parser.parseExpression(Precedence.NONE);
    }
    if (parser.matchToken(TokenType.COLON)) {
      if (!parser.check(TokenType.RBRACKET)) {
        step = parser.parseExpression(Precedence.NONE);
      }
    }
    parser.expect(TokenType.RBRACKET);
    return AST.SliceExpr(left, start, stop, step);
  }

  const first = parser.parseExpression(Precedence.NONE);

  if (parser.check(TokenType.COLON)) {
    // [start:...] slice
    parser.advance();
    let stop = null;
    let step = null;

    if (!parser.check(TokenType.COLON) && !parser.check(TokenType.RBRACKET)) {
      stop = parser.parseExpression(Precedence.NONE);
    }
    if (parser.matchToken(TokenType.COLON)) {
      if (!parser.check(TokenType.RBRACKET)) {
        step = parser.parseExpression(Precedence.NONE);
      }
    }
    parser.expect(TokenType.RBRACKET);
    return AST.SliceExpr(left, first, stop, step);
  }

  parser.expect(TokenType.RBRACKET);
  return AST.IndexExpr(left, first);
}

export function parseDot(parser, left, token) {
  const attr = parser.expect(TokenType.IDENTIFIER).value;
  return AST.DotExpr(left, attr);
}

export function parseTernary(parser, left, token) {
  const condition = parser.parseExpression(Precedence.TERNARY);
  parser.expect(TokenType.ELSE);
  const elseBody = parser.parseExpression(Precedence.ASSIGNMENT);
  return AST.TernaryExpr(left, condition, elseBody);
}

export const INFIX_RULES = {
  [TokenType.PLUS]:    { prec: Precedence.ADDITION,   fn: parseBinary(Precedence.ADDITION, '+') },
  [TokenType.MINUS]:   { prec: Precedence.ADDITION,   fn: parseBinary(Precedence.ADDITION, '-') },
  [TokenType.STAR]:    { prec: Precedence.MULTIPLY,   fn: parseBinary(Precedence.MULTIPLY, '*') },
  [TokenType.SLASH]:   { prec: Precedence.MULTIPLY,   fn: parseBinary(Precedence.MULTIPLY, '/') },
  [TokenType.PERCENT]: { prec: Precedence.MULTIPLY,   fn: parseBinary(Precedence.MULTIPLY, '%') },
  [TokenType.DSLASH]:  { prec: Precedence.MULTIPLY,   fn: parseBinary(Precedence.MULTIPLY, '//') },
  [TokenType.DSTAR]:   { prec: Precedence.POWER,      fn: parseBinary(Precedence.POWER - 1, '**') },
  [TokenType.EQ]:      { prec: Precedence.EQUALITY,   fn: parseBinary(Precedence.EQUALITY, '==') },
  [TokenType.NEQ]:     { prec: Precedence.EQUALITY,   fn: parseBinary(Precedence.EQUALITY, '!=') },
  [TokenType.LT]:      { prec: Precedence.COMPARISON, fn: parseBinary(Precedence.COMPARISON, '<') },
  [TokenType.GT]:      { prec: Precedence.COMPARISON, fn: parseBinary(Precedence.COMPARISON, '>') },
  [TokenType.LTE]:     { prec: Precedence.COMPARISON, fn: parseBinary(Precedence.COMPARISON, '<=') },
  [TokenType.GTE]:     { prec: Precedence.COMPARISON, fn: parseBinary(Precedence.COMPARISON, '>=') },
  [TokenType.IN]:      { prec: Precedence.COMPARISON, fn: parseBinary(Precedence.COMPARISON, 'in') },
  [TokenType.NOT]:     { prec: Precedence.COMPARISON, fn: parseNotIn },
  [TokenType.AND]:     { prec: Precedence.AND,        fn: parseBinary(Precedence.AND, 'and') },
  [TokenType.OR]:      { prec: Precedence.OR,         fn: parseBinary(Precedence.OR, 'or') },
  [TokenType.LPAREN]:  { prec: Precedence.CALL,       fn: parseCall },
  [TokenType.LBRACKET]:{ prec: Precedence.INDEX,      fn: parseIndex },
  [TokenType.DOT]:     { prec: Precedence.INDEX,      fn: parseDot },
  [TokenType.IF]:      { prec: Precedence.TERNARY,    fn: parseTernary },
};
