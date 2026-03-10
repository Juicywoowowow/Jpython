# expect: 15
class Counter:
    def __init__(self):
        self.count = 0

    def add(self, n):
        self.count += n

c = Counter()
c.add(10)
c.add(5)
print(c.count)
