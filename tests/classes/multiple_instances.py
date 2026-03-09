# expect: Alice
# expect: Bob
class Person:
    def __init__(self, name):
        self.name = name

a = Person("Alice")
b = Person("Bob")
print(a.name)
print(b.name)
