# expect: 5
# expect: 8
def outer(x):
    def inner(y=x):
        return y
    return inner

fn = outer(5)
print(fn())
print(fn(8))