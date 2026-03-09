# expect_error: nonlocal and global
def outer():
    x = 1

    def inner():
        global x
        nonlocal x
        return x

    return inner()

outer()