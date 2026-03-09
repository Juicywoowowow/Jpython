# expect: [Token(7)]
class Token:
    def __init__(self, value):
        self.value = value

    def __repr__(self):
        return "Token(" + str(self.value) + ")"

print([Token(7)])

