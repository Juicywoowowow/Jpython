# expect: 12
class Counter:
    def __init__(self, value):
        self.value = value

    def __add__(self, other):
        return self.value + other.value

print(Counter(5) + Counter(7))

