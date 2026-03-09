# expect_error: parameter and nonlocal
def outer():
    x = 1

    def inner(x):
        nonlocal x
        return x

    return inner(2)

outer()