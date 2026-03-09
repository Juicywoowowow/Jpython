# expect: Alice
# expect: 30
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

p = Person("Alice", 30)
print(p.name)
print(p.age)
