import { TokenType } from './token-types.js';
import { createToken } from './token.js';

export class IndentTracker {
  constructor() {
    this.stack = [0];
  }

  process(spaces, line) {
    const tokens = [];
    const current = this.stack[this.stack.length - 1];

    if (spaces > current) {
      this.stack.push(spaces);
      tokens.push(createToken(TokenType.INDENT, '', line, 0));
    } else if (spaces < current) {
      while (this.stack.length > 1 && this.stack[this.stack.length - 1] > spaces) {
        this.stack.pop();
        tokens.push(createToken(TokenType.DEDENT, '', line, 0));
      }
      if (this.stack[this.stack.length - 1] !== spaces) {
        throw new SyntaxError(`Indentation error at line ${line}`);
      }
    }

    return tokens;
  }

  flush(line) {
    const tokens = [];
    while (this.stack.length > 1) {
      this.stack.pop();
      tokens.push(createToken(TokenType.DEDENT, '', line, 0));
    }
    return tokens;
  }
}
