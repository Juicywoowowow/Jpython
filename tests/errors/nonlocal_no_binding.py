# expect_error: no binding for nonlocal
def outer():
    def inner():
        nonlocal missing
        return missing
    return inner()

outer()