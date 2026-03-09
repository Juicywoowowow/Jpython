# expect: Buddy
# expect: Dog
class Animal:
    def __init__(self, name):
        self.name = name

class Dog(Animal):
    def __init__(self, name):
        self.name = name
        self.kind = "Dog"

d = Dog("Buddy")
print(d.name)
print(d.kind)
