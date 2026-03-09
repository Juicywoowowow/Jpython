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
  PRINT: 'PRINT',

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

  // Punctuation
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACKET: 'LBRACKET',
  RBRACKET: 'RBRACKET',
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
  'if': TokenType.IF,
  'elif': TokenType.ELIF,
  'else': TokenType.ELSE,
  'while': TokenType.WHILE,
  'print': TokenType.PRINT,
};
