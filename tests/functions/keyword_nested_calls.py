# expect: 12
def mul(a, b):
    return a * b

def apply(x):
    return mul(b=3, a=x + 1)

print(apply(3))