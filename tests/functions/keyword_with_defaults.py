# expect: 13
# expect: 13
def total(a, b=4, c=5):
    return a + b + c

print(total(0, c=9))
print(total(a=1, c=10, b=2))