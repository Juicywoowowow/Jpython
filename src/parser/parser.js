import { TokenType } from '../lexer/token-types.js';
import { Precedence } from './precedence.js';
import * as AST from './ast-nodes.js';
import * as Prefix from './prefix-parselets.js';
import { INFIX_RULES } from './infix-parselets.js';

const PREFIX_RULES = {
  [TokenType.NUMBER]:     Prefix.parseNumber,
  [TokenType.STRING]:     Prefix.parseString,
  [TokenType.TRUE]:       Prefix.parseTrue,
  [TokenType.FALSE]:      Prefix.parseFalse,
  [TokenType.NONE]:       Prefix.parseNone,
  [TokenType.IDENTIFIER]: Prefix.parseIdentifier,
  [TokenType.MINUS]:      Prefix.parseUnaryMinus,
  [TokenType.NOT]:        Prefix.parseNot,
  [TokenType.LPAREN]:     Prefix.parseGrouping,
  [TokenType.LBRACKET]:   Prefix.parseList,
};

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  advance() {
    const tok = this.tokens[this.pos];
    this.pos++;
    return tok;
  }

  check(type) {
    return this.peek().type === type;
  }

  matchToken(type) {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  expect(type) {
    if (!this.check(type)) {
      const tok = this.peek();
      throw new SyntaxError(
        `Expected ${type} but got ${tok.type} ('${tok.value}') at line ${tok.line}:${tok.col}`
      );
    }
    return this.advance();
  }

  skipNewlines() {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  parseExpression(precedence = Precedence.NONE) {
    const token = this.advance();
    const prefixFn = PREFIX_RULES[token.type];
    if (!prefixFn) {
      throw new SyntaxError(
        `Unexpected token ${token.type} ('${token.value}') at line ${token.line}:${token.col}`
      );
    }

    let left = prefixFn(this, token);

    while (this.pos < this.tokens.length) {
      const next = this.peek();
      const infix = INFIX_RULES[next.type];
      if (!infix || infix.prec <= precedence) break;
      this.advance();
      left = infix.fn(this, left, next);
    }

    return left;
  }

  parseBlock() {
    this.expect(TokenType.COLON);
    this.expect(TokenType.NEWLINE);
    this.expect(TokenType.INDENT);

    const stmts = [];
    while (!this.check(TokenType.DEDENT) && !this.check(TokenType.EOF)) {
      this.skipNewlines();
      if (this.check(TokenType.DEDENT) || this.check(TokenType.EOF)) break;
      stmts.push(this.parseStatement());
    }

    this.expect(TokenType.DEDENT);
    return stmts;
  }

  parseIfStatement() {
    const condition = this.parseExpression();
    const body = this.parseBlock();

    const elifs = [];
    let elseBody = null;

    this.skipNewlines();
    while (this.check(TokenType.ELIF)) {
      this.advance();
      const elifCond = this.parseExpression();
      const elifBody = this.parseBlock();
      elifs.push({ condition: elifCond, body: elifBody });
      this.skipNewlines();
    }

    if (this.check(TokenType.ELSE)) {
      this.advance();
      elseBody = this.parseBlock();
    }

    return AST.IfStmt(condition, body, elifs, elseBody);
  }

  parseWhileStatement() {
    const condition = this.parseExpression();
    const body = this.parseBlock();
    return AST.WhileStmt(condition, body);
  }

  parsePrintStatement() {
    this.expect(TokenType.LPAREN);
    const args = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.matchToken(TokenType.COMMA));
    }
    this.expect(TokenType.RPAREN);
    return AST.PrintStmt(args);
  }

  parseStatement() {
    this.skipNewlines();

    if (this.check(TokenType.IF)) {
      this.advance();
      return this.parseIfStatement();
    }

    if (this.check(TokenType.WHILE)) {
      this.advance();
      return this.parseWhileStatement();
    }

    if (this.check(TokenType.PRINT)) {
      this.advance();
      return this.parsePrintStatement();
    }

    // Assignment or expression statement
    const expr = this.parseExpression();

    if (this.check(TokenType.ASSIGN)) {
      this.advance();
      if (expr.type === 'Identifier') {
        const value = this.parseExpression();
        return AST.AssignStmt(expr.name, value);
      }
      if (expr.type === 'IndexExpr') {
        const value = this.parseExpression();
        return AST.IndexAssignStmt(expr.object, expr.index, value);
      }
      throw new SyntaxError(`Invalid assignment target at line ${this.peek().line}`);
    }

    return AST.ExprStmt(expr);
  }

  parse() {
    const body = [];
    this.skipNewlines();

    while (!this.check(TokenType.EOF)) {
      body.push(this.parseStatement());
      this.skipNewlines();
    }

    return AST.Program(body);
  }
}
