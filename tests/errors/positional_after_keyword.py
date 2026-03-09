# expect_error: positional argument follows keyword argument
def add(a, b):
    return a + b

print(add(a=1, 2))