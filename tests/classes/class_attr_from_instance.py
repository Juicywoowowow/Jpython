# expect: mammal
class Animal:
    kind = "mammal"

    def __init__(self, name):
        self.name = name

a = Animal("cat")
print(a.kind)
