# expect: 15
# expect: 8
def add(a, b=10):
    return a + b

print(add(5))
print(add(5, 3))