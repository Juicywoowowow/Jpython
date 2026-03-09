# expect: 3
# expect: True
# expect: False
class Bag:
    def __init__(self, items):
        self.items = items

    def __len__(self):
        return len(self.items)

print(len(Bag([1, 2, 3])))
print(bool(Bag([1])))
print(bool(Bag([])))

