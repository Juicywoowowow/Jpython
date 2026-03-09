# expect: 14
def outer(base):
    def inner(x, y=4):
        return base + x + y
    return inner

fn = outer(5)
print(fn(y=6, x=3))