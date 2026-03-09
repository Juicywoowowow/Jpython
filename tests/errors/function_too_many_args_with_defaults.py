# expect_error: takes from 1 to 2 positional arguments
def add(a, b=2):
    return a + b

print(add(1, 2, 3))