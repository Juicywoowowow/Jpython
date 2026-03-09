# expect: 9
def outer():
    x = 2

    def middle():
        def inner():
            nonlocal x
            x = x + 7

        inner()

    middle()
    print(x)

outer()