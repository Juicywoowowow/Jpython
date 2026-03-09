# expect: 8
def outer(a):
    def inner(b):
        return a + b
    return inner

fn = outer(5)
print(fn(3))