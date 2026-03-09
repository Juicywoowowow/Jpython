# expect_error: keyword argument repeated
def add(a, b):
    return a + b

print(add(a=1, a=2))