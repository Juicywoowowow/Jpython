# expect: 5
def outer():
    x = 1

    def inner():
        nonlocal x
        x = x + 4

    inner()
    print(x)

outer()