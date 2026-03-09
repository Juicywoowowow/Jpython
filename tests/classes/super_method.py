# expect: hello world
class Greeter:
    def greet(self):
        return "hello"

class LoudGreeter(Greeter):
    def greet(self):
        return super().greet() + " world"

print(LoudGreeter().greet())

