# expect: flying
# expect: swimming
class Flyer:
    def fly(self):
        return "flying"

class Swimmer:
    def swim(self):
        return "swimming"

class Duck(Flyer, Swimmer):
    pass

d = Duck()
print(d.fly())
print(d.swim())
