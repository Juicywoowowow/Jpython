# expect: Ada Lovelace
# expect: 20 1
# expect: Python
class Person:
    def __init__(self, name):
        self.name = name

person = Person("Ada")
print("{0.name} Lovelace".format(person))
print("{0[1]} {1[first]}".format([10, 20], {"first": 1}))
print("{data[key]}".format(data={"key": "Python"}))