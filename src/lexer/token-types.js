export const TokenType = {
  // Literals
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  IDENTIFIER: 'IDENTIFIER',

  // Keywords
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  NONE: 'NONE',
  AND: 'AND',
  OR: 'OR',
  NOT: 'NOT',
  IF: 'IF',
  ELIF: 'ELIF',
  ELSE: 'ELSE',
  WHILE: 'WHILE',
  DEF: 'DEF',
  RETURN: 'RETURN',
  GLOBAL: 'GLOBAL',
  NONLOCAL: 'NONLOCAL',
  FOR: 'FOR',
  IN: 'IN',
  BREAK: 'BREAK',
  CONTINUE: 'CONTINUE',
  PRINT: 'PRINT',
  CLASS: 'CLASS',
  PASS: 'PASS',
  LAMBDA: 'LAMBDA',
  TRY: 'TRY',
  EXCEPT: 'EXCEPT',
  FINALLY: 'FINALLY',
  RAISE: 'RAISE',
  AS: 'AS',

  // Operators
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  STAR: 'STAR',
  SLASH: 'SLASH',
  PERCENT: 'PERCENT',
  EQ: 'EQ',           // ==
  NEQ: 'NEQ',         // !=
  LT: 'LT',           // <
  GT: 'GT',            // >
  LTE: 'LTE',         // <=
  GTE: 'GTE',         // >=
  ASSIGN: 'ASSIGN',   // =

  DOT: 'DOT',

  // Punctuation
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  COMMA: 'COMMA',
  COLON: 'COLON',

  // Structure
  NEWLINE: 'NEWLINE',
  INDENT: 'INDENT',
  DEDENT: 'DEDENT',
  EOF: 'EOF',
};

export const KEYWORDS = {
  'True': TokenType.TRUE,
  'False': TokenType.FALSE,
  'None': TokenType.NONE,
  'and': TokenType.AND,
  'or': TokenType.OR,
  'not': TokenType.NOT,
  'def': TokenType.DEF,
  'return': TokenType.RETURN,
  'global': TokenType.GLOBAL,
  'nonlocal': TokenType.NONLOCAL,
  'if': TokenType.IF,
  'elif': TokenType.ELIF,
  'else': TokenType.ELSE,
  'while': TokenType.WHILE,
  'for': TokenType.FOR,
  'in': TokenType.IN,
  'break': TokenType.BREAK,
  'continue': TokenType.CONTINUE,
  'print': TokenType.PRINT,
  'class': TokenType.CLASS,
  'pass': TokenType.PASS,
  'lambda': TokenType.LAMBDA,
  'try': TokenType.TRY,
  'except': TokenType.EXCEPT,
  'finally': TokenType.FINALLY,
  'raise': TokenType.RAISE,
  'as': TokenType.AS,
};
