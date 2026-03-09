# expect: 10
# expect: 20
class Box:
    def __init__(self, w, h):
        self.width = w
        self.height = h

b = Box(10, 20)
print(b.width)
print(b.height)
