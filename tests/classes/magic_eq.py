# expect: True
# expect: False
class Box:
    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        return self.value == other.value

print(Box(1) == Box(1))
print(Box(1) == Box(2))

