# expect: 7
# expect: 9
def calc(a, b=1 + 2 * 3):
    return a + b

print(calc(0))
print(calc(2, 7))