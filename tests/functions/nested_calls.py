# expect: 9
def inc(x):
    return x + 1

def add_two(x):
    return inc(inc(x))

print(add_two(7))