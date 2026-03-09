import { TokenType } from '../lexer/token-types.js';
import { Precedence } from './precedence.js';
import * as AST from './ast-nodes.js';
import * as Prefix from './prefix-parselets.js';
import { INFIX_RULES } from './infix-parselets.js';

const PREFIX_RULES = {
  [TokenType.NUMBER]: Prefix.parseNumber,
  [TokenType.STRING]: Prefix.parseString,
  [TokenType.TRUE]: Prefix.parseTrue,
  [TokenType.FALSE]: Prefix.parseFalse,
  [TokenType.NONE]: Prefix.parseNone,
  [TokenType.IDENTIFIER]: Prefix.parseIdentifier,
  [TokenType.MINUS]: Prefix.parseUnaryMinus,
  [TokenType.NOT]: Prefix.parseNot,
  [TokenType.LPAREN]: Prefix.parseGrouping,
  [TokenType.LBRACKET]: Prefix.parseList,
  [TokenType.LBRACE]: Prefix.parseDict,
  [TokenType.LAMBDA]: Prefix.parseLambda,
};

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.loopDepth = 0;
    this.functionDepth = 0;
  }

  peek() {
    return this.tokens[this.pos];
  }

  peekNext() {
    return this.tokens[this.pos + 1] || this.tokens[this.pos];
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

  parseParameterList(terminatorType) {
    const params = [];
    const defaults = [];
    const seen = new Set();
    let sawDefault = false;

    if (!this.check(terminatorType)) {
      do {
        const param = this.expect(TokenType.IDENTIFIER).value;
        if (seen.has(param)) {
          throw new SyntaxError(`Duplicate parameter name '${param}'`);
        }
        seen.add(param);
        params.push(param);

        if (this.matchToken(TokenType.ASSIGN)) {
          sawDefault = true;
          defaults.push(this.parseExpression());
        } else if (sawDefault) {
          throw new SyntaxError('SyntaxError: non-default argument follows default argument');
        }

        if (this.check(terminatorType)) break;
      } while (this.matchToken(TokenType.COMMA));
    }

    return { params, defaults };
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
    this.loopDepth++;
    const body = this.parseBlock();
    this.loopDepth--;
    return AST.WhileStmt(condition, body);
  }

  parseForStatement() {
    const target = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.IN);
    const iterable = this.parseExpression();
    this.loopDepth++;
    const body = this.parseBlock();
    this.loopDepth--;
    return AST.ForStmt(target, iterable, body);
  }

  parseFunctionDefStatement() {
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LPAREN);

    const { params, defaults } = this.parseParameterList(TokenType.RPAREN);

    this.expect(TokenType.RPAREN);
    this.functionDepth++;
    const body = this.parseBlock();
    this.functionDepth--;
    return AST.FunctionDefStmt(name, params, defaults, body);
  }

  parseReturnStatement() {
    if (this.functionDepth === 0) {
      throw new SyntaxError("SyntaxError: 'return' outside function");
    }

    if (
      this.check(TokenType.NEWLINE) ||
      this.check(TokenType.DEDENT) ||
      this.check(TokenType.EOF)
    ) {
      return AST.ReturnStmt();
    }

    return AST.ReturnStmt(this.parseExpression());
  }

  parseScopeNames(keywordType) {
    const names = [this.expect(TokenType.IDENTIFIER).value];
    while (this.matchToken(TokenType.COMMA)) {
      names.push(this.expect(TokenType.IDENTIFIER).value);
    }

    if (keywordType === TokenType.GLOBAL) {
      return AST.GlobalStmt(names);
    }

    if (this.functionDepth === 0) {
      throw new SyntaxError('SyntaxError: nonlocal declaration not allowed at module level');
    }

    return AST.NonlocalStmt(names);
  }

  parseBreakStatement() {
    if (this.loopDepth === 0) {
      throw new SyntaxError("SyntaxError: 'break' outside loop");
    }
    return AST.BreakStmt();
  }

  parseContinueStatement() {
    if (this.loopDepth === 0) {
      throw new SyntaxError("SyntaxError: 'continue' not properly in loop");
    }
    return AST.ContinueStmt();
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

  parseClassDefStatement() {
    const name = this.expect(TokenType.IDENTIFIER).value;

    const bases = [];
    if (this.matchToken(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          bases.push(this.parseExpression());
        } while (this.matchToken(TokenType.COMMA));
      }
      this.expect(TokenType.RPAREN);
    }

    const body = this.parseBlock();
    return AST.ClassDefStmt(name, bases, body);
  }

  parseTryStatement() {
    const body = this.parseBlock();
    const handlers = [];
    let finallyBody = null;

    this.skipNewlines();

    while (this.check(TokenType.EXCEPT)) {
      this.advance();
      let exceptionType = null;
      let alias = null;

      if (!this.check(TokenType.COLON)) {
        exceptionType = this.parseExpression();
        if (this.matchToken(TokenType.AS)) {
          alias = this.expect(TokenType.IDENTIFIER).value;
        }
      }

      const handlerBody = this.parseBlock();
      handlers.push({ type: exceptionType, alias, body: handlerBody });
      this.skipNewlines();
    }

    if (this.check(TokenType.FINALLY)) {
      this.advance();
      finallyBody = this.parseBlock();
    }

    if (handlers.length === 0 && !finallyBody) {
      throw new SyntaxError('SyntaxError: expected except or finally block');
    }

    return AST.TryStmt(body, handlers, finallyBody);
  }

  parseRaiseStatement() {
    if (
      this.check(TokenType.NEWLINE) ||
      this.check(TokenType.DEDENT) ||
      this.check(TokenType.EOF)
    ) {
      return AST.RaiseStmt();
    }
    return AST.RaiseStmt(this.parseExpression());
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

    if (this.check(TokenType.DEF)) {
      this.advance();
      return this.parseFunctionDefStatement();
    }

    if (this.check(TokenType.RETURN)) {
      this.advance();
      return this.parseReturnStatement();
    }

    if (this.check(TokenType.GLOBAL)) {
      this.advance();
      return this.parseScopeNames(TokenType.GLOBAL);
    }

    if (this.check(TokenType.NONLOCAL)) {
      this.advance();
      return this.parseScopeNames(TokenType.NONLOCAL);
    }

    if (this.check(TokenType.FOR)) {
      this.advance();
      return this.parseForStatement();
    }

    if (this.check(TokenType.BREAK)) {
      this.advance();
      return this.parseBreakStatement();
    }

    if (this.check(TokenType.CONTINUE)) {
      this.advance();
      return this.parseContinueStatement();
    }

    if (this.check(TokenType.PRINT)) {
      this.advance();
      return this.parsePrintStatement();
    }

    if (this.check(TokenType.CLASS)) {
      this.advance();
      return this.parseClassDefStatement();
    }

    if (this.check(TokenType.PASS)) {
      this.advance();
      return AST.PassStmt();
    }

    if (this.check(TokenType.TRY)) {
      this.advance();
      return this.parseTryStatement();
    }

    if (this.check(TokenType.RAISE)) {
      this.advance();
      return this.parseRaiseStatement();
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
      if (expr.type === 'DotExpr') {
        const value = this.parseExpression();
        return AST.DotAssignStmt(expr.object, expr.attr, value);
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
