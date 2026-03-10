# expect: 42
# expect: 14
# expect: 120
# expect: 2.0
# expect: SyntaxError
# expect: ZeroDivisionError

class Token:
    def __init__(self, type, value):
        self.type = type
        self.value = value

    def __repr__(self):
        return "Token(" + self.type + ", " + str(self.value) + ")"

class Lexer:
    def __init__(self, text):
        self.text = text
        self.pos = 0

    def get_next_token(self):
        while self.pos < len(self.text):
            current_char = self.text[self.pos]

            if current_char == ' ':
                self.pos = self.pos + 1
                continue

            if current_char >= '0' and current_char <= '9':
                num_str = ""
                while self.pos < len(self.text) and self.text[self.pos] >= '0' and self.text[self.pos] <= '9':
                    num_str = num_str + self.text[self.pos]
                    self.pos = self.pos + 1
                return Token("NUMBER", int(num_str))

            if current_char == '+':
                self.pos = self.pos + 1
                return Token("PLUS", "+")
            if current_char == '-':
                self.pos = self.pos + 1
                return Token("MINUS", "-")
            if current_char == '*':
                self.pos = self.pos + 1
                return Token("MUL", "*")
            if current_char == '/':
                self.pos = self.pos + 1
                return Token("DIV", "/")
            if current_char == '(':
                self.pos = self.pos + 1
                return Token("LPAREN", "(")
            if current_char == ')':
                self.pos = self.pos + 1
                return Token("RPAREN", ")")

            raise ValueError("Invalid character: " + current_char)

        return Token("EOF", None)

class Parser:
    def __init__(self, lexer):
        self.lexer = lexer
        self.current_token = self.lexer.get_next_token()

    def eat(self, token_type):
        if self.current_token.type == token_type:
            self.current_token = self.lexer.get_next_token()
        else:
            raise ValueError("Expected " + token_type + ", got " + self.current_token.type)

    def factor(self):
        token = self.current_token
        if token.type == "NUMBER":
            self.eat("NUMBER")
            return token.value
        elif token.type == "LPAREN":
            self.eat("LPAREN")
            result = self.expr()
            self.eat("RPAREN")
            return result
        raise ValueError("Syntax error: expected NUMBER or LPAREN")

    def term(self):
        result = self.factor()
        while self.current_token.type == "MUL" or self.current_token.type == "DIV":
            token = self.current_token
            if token.type == "MUL":
                self.eat("MUL")
                result = result * self.factor()
            elif token.type == "DIV":
                self.eat("DIV")
                divisor = self.factor()
                if divisor == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / divisor
        return result

    def expr(self):
        result = self.term()
        while self.current_token.type == "PLUS" or self.current_token.type == "MINUS":
            token = self.current_token
            if token.type == "PLUS":
                self.eat("PLUS")
                result = result + self.term()
            elif token.type == "MINUS":
                self.eat("MINUS")
                result = result - self.term()
        return result

def evaluate(text):
    try:
        lexer = Lexer(text)
        parser = Parser(lexer)
        return parser.expr()
    except ZeroDivisionError:
        return "ZeroDivisionError"
    except ValueError as e:
        return "SyntaxError"

print(evaluate("42"))
print(evaluate("2 + 3 * 4"))
print(evaluate("(10 + 20) * 4"))
print(evaluate("10 / 2 - 3"))
print(evaluate("10 + "))
print(evaluate("10 / 0"))
