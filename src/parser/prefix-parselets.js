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
  if (parser.check(TokenType.RPAREN)) {
    parser.advance();
    return AST.TupleExpr([]);
  }

  const expr = parser.parseExpression(Precedence.NONE);

  if (parser.matchToken(TokenType.COMMA)) {
    const elements = [expr];
    while (!parser.check(TokenType.RPAREN)) {
      elements.push(parser.parseExpression(Precedence.NONE));
      if (!parser.matchToken(TokenType.COMMA)) break;
    }
    parser.expect(TokenType.RPAREN);
    return AST.TupleExpr(elements);
  }

  parser.expect(TokenType.RPAREN);
  return expr;
}

export function parseList(parser, token) {
  const elements = [];
  if (!parser.check(TokenType.RBRACKET)) {
    const first = parser.parseExpression(Precedence.NONE);

    if (parser.matchToken(TokenType.FOR)) {
      const clauses = [];
      // Parse first for clause
      const target = parser.expect(TokenType.IDENTIFIER).value;
      parser.expect(TokenType.IN);
      const iterable = parser.parseExpression(Precedence.NONE);
      let condition = null;
      if (parser.matchToken(TokenType.IF)) {
        condition = parser.parseExpression(Precedence.NONE);
      }
      clauses.push({ target, iterable, condition });

      // Parse additional for clauses
      while (parser.matchToken(TokenType.FOR)) {
        const nextTarget = parser.expect(TokenType.IDENTIFIER).value;
        parser.expect(TokenType.IN);
        const nextIterable = parser.parseExpression(Precedence.NONE);
        let nextCondition = null;
        if (parser.matchToken(TokenType.IF)) {
          nextCondition = parser.parseExpression(Precedence.NONE);
        }
        clauses.push({ target: nextTarget, iterable: nextIterable, condition: nextCondition });
      }

      parser.expect(TokenType.RBRACKET);
      return AST.ListComprehensionExpr(first, clauses);
    }

    elements.push(first);
    while (parser.matchToken(TokenType.COMMA)) {
      elements.push(parser.parseExpression(Precedence.NONE));
    }
  }
  parser.expect(TokenType.RBRACKET);
  return AST.ListExpr(elements);
}

export function parseLambda(parser, token) {
  const { params, defaults } = parser.parseParameterList(TokenType.COLON);
  parser.expect(TokenType.COLON);
  return AST.LambdaExpr(params, defaults, parser.parseExpression(Precedence.NONE));
}

export function parseDict(parser, token) {
  const entries = [];
  if (!parser.check(TokenType.RBRACE)) {
    do {
      const key = parser.parseExpression(Precedence.NONE);
      parser.expect(TokenType.COLON);
      const value = parser.parseExpression(Precedence.NONE);
      entries.push({ key, value });
    } while (parser.matchToken(TokenType.COMMA));
  }
  parser.expect(TokenType.RBRACE);
  return AST.DictExpr(entries);
}
