import { TokenType, KEYWORDS } from './token-types.js';
import { createToken } from './token.js';
import { IndentTracker } from './indent-tracker.js';

export class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.indent = new IndentTracker();
    this.atLineStart = true;
  }

  peek() {
    return this.pos < this.source.length ? this.source[this.pos] : null;
  }

  advance() {
    const ch = this.source[this.pos++];
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  match(expected) {
    if (this.pos < this.source.length && this.source[this.pos] === expected) {
      this.advance();
      return true;
    }
    return false;
  }

  skipLineComment() {
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      this.advance();
    }
  }

  readString(quote) {
    const startLine = this.line;
    const startCol = this.col;
    let value = '';
    while (this.pos < this.source.length && this.source[this.pos] !== quote) {
      if (this.source[this.pos] === '\\') {
        this.advance();
        const esc = this.advance();
        switch (esc) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case '\\': value += '\\'; break;
          case "'": value += "'"; break;
          case '"': value += '"'; break;
          default: value += '\\' + esc;
        }
      } else {
        value += this.advance();
      }
    }
    if (this.pos >= this.source.length) {
      throw new SyntaxError(`Unterminated string at line ${startLine}:${startCol}`);
    }
    this.advance(); // closing quote
    return createToken(TokenType.STRING, value, startLine, startCol);
  }

  readNumber() {
    const startCol = this.col;
    let num = '';
    while (this.pos < this.source.length && /[0-9]/.test(this.source[this.pos])) {
      num += this.advance();
    }
    if (this.pos < this.source.length && this.source[this.pos] === '.') {
      num += this.advance();
      while (this.pos < this.source.length && /[0-9]/.test(this.source[this.pos])) {
        num += this.advance();
      }
    }
    return createToken(TokenType.NUMBER, num, this.line, startCol);
  }

  readIdentifier() {
    const startCol = this.col;
    let id = '';
    while (this.pos < this.source.length && /[a-zA-Z0-9_]/.test(this.source[this.pos])) {
      id += this.advance();
    }
    const type = KEYWORDS[id] || TokenType.IDENTIFIER;
    return createToken(type, id, this.line, startCol);
  }

  countIndent() {
    let spaces = 0;
    while (this.pos < this.source.length && this.source[this.pos] === ' ') {
      this.advance();
      spaces++;
    }
    return spaces;
  }

  tokenize() {
    const tokens = [];

    while (this.pos < this.source.length) {
      // Handle indentation at line start
      if (this.atLineStart) {
        this.atLineStart = false;

        // Skip blank lines
        if (this.peek() === '\n') {
          this.advance();
          this.atLineStart = true;
          continue;
        }
        if (this.peek() === '#') {
          this.skipLineComment();
          if (this.peek() === '\n') {
            this.advance();
          }
          this.atLineStart = true;
          continue;
        }

        const spaces = this.countIndent();

        // Skip blank lines after counting indent
        if (this.peek() === '\n' || this.peek() === null || this.peek() === '#') {
          if (this.peek() === '#') {
            this.skipLineComment();
          }
          if (this.peek() === '\n') {
            this.advance();
          }
          this.atLineStart = true;
          continue;
        }

        const indentTokens = this.indent.process(spaces, this.line);
        tokens.push(...indentTokens);
      }

      const ch = this.peek();

      if (ch === null) break;

      // Newline
      if (ch === '\n') {
        tokens.push(createToken(TokenType.NEWLINE, '\\n', this.line, this.col));
        this.advance();
        this.atLineStart = true;
        continue;
      }

      // Skip inline whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
        continue;
      }

      // Comments
      if (ch === '#') {
        this.skipLineComment();
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch)) {
        tokens.push(this.readNumber());
        continue;
      }

      // Strings
      if (ch === '"' || ch === "'") {
        this.advance();
        tokens.push(this.readString(ch));
        continue;
      }

      // Identifiers / keywords
      if (/[a-zA-Z_]/.test(ch)) {
        tokens.push(this.readIdentifier());
        continue;
      }

      // Two-char operators
      const startCol = this.col;
      if (ch === '=' && this.source[this.pos + 1] === '=') {
        this.advance(); this.advance();
        tokens.push(createToken(TokenType.EQ, '==', this.line, startCol));
        continue;
      }
      if (ch === '!' && this.source[this.pos + 1] === '=') {
        this.advance(); this.advance();
        tokens.push(createToken(TokenType.NEQ, '!=', this.line, startCol));
        continue;
      }
      if (ch === '<' && this.source[this.pos + 1] === '=') {
        this.advance(); this.advance();
        tokens.push(createToken(TokenType.LTE, '<=', this.line, startCol));
        continue;
      }
      if (ch === '>' && this.source[this.pos + 1] === '=') {
        this.advance(); this.advance();
        tokens.push(createToken(TokenType.GTE, '>=', this.line, startCol));
        continue;
      }

      // Single-char tokens
      this.advance();
      switch (ch) {
        case '+': tokens.push(createToken(TokenType.PLUS, '+', this.line, startCol)); break;
        case '-': tokens.push(createToken(TokenType.MINUS, '-', this.line, startCol)); break;
        case '*': tokens.push(createToken(TokenType.STAR, '*', this.line, startCol)); break;
        case '/': tokens.push(createToken(TokenType.SLASH, '/', this.line, startCol)); break;
        case '%': tokens.push(createToken(TokenType.PERCENT, '%', this.line, startCol)); break;
        case '=': tokens.push(createToken(TokenType.ASSIGN, '=', this.line, startCol)); break;
        case '<': tokens.push(createToken(TokenType.LT, '<', this.line, startCol)); break;
        case '>': tokens.push(createToken(TokenType.GT, '>', this.line, startCol)); break;
        case '(': tokens.push(createToken(TokenType.LPAREN, '(', this.line, startCol)); break;
        case ')': tokens.push(createToken(TokenType.RPAREN, ')', this.line, startCol)); break;
        case '[': tokens.push(createToken(TokenType.LBRACKET, '[', this.line, startCol)); break;
        case ']': tokens.push(createToken(TokenType.RBRACKET, ']', this.line, startCol)); break;
        case '{': tokens.push(createToken(TokenType.LBRACE, '{', this.line, startCol)); break;
        case '}': tokens.push(createToken(TokenType.RBRACE, '}', this.line, startCol)); break;
        case ',': tokens.push(createToken(TokenType.COMMA, ',', this.line, startCol)); break;
        case ':': tokens.push(createToken(TokenType.COLON, ':', this.line, startCol)); break;
        case '.': tokens.push(createToken(TokenType.DOT, '.', this.line, startCol)); break;
        default:
          throw new SyntaxError(`Unexpected character '${ch}' at line ${this.line}:${startCol}`);
      }
    }

    // Flush remaining dedents
    tokens.push(...this.indent.flush(this.line));
    tokens.push(createToken(TokenType.EOF, '', this.line, this.col));

    return tokens;
  }
}
