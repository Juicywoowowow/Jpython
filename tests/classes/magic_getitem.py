# expect: 20
class Wrapper:
    def __init__(self, items):
        self.items = items

    def __getitem__(self, index):
        return self.items[index]

print(Wrapper([10, 20, 30])[1])

