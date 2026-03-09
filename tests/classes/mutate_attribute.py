# expect: 5
# expect: 99
class Counter:
    def __init__(self, val):
        self.val = val

c = Counter(5)
print(c.val)
c.val = 99
print(c.val)
