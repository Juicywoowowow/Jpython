# expect: 200
class Rectangle:
    def __init__(self, w, h):
        self.width = w
        self.height = h

    def area(self):
        return self.width * self.height

r = Rectangle(10, 20)
print(r.area())
