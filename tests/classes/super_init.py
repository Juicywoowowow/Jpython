# expect: Ada
# expect: 42
class Person:
    def __init__(self, name):
        self.name = name

class User(Person):
    def __init__(self, name, score):
        super().__init__(name)
        self.score = score

u = User("Ada", 42)
print(u.name)
print(u.score)

