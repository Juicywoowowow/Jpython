# expect: True
# expect: True
# expect: False
class Animal:
    pass

class Dog(Animal):
    pass

class Cat:
    pass

d = Dog()
print(isinstance(d, Dog))
print(isinstance(d, Animal))
print(isinstance(d, Cat))
