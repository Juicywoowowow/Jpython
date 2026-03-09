# expect: I am alive
class Animal:
    def breathe(self):
        print("I am alive")

class Dog(Animal):
    def speak(self):
        print("Woof!")

d = Dog()
d.breathe()
