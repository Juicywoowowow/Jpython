# expect: 6
# expect: 8
# expect: 10
def total(a, b=2, c=3):
    return a + b + c

print(total(1))
print(total(1, 4))
print(total(1, 4, 5))