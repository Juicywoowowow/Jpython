# expect: inner
# expect: outer
def outer():
    value = "outer"

    def inner():
        value = "inner"
        print(value)

    inner()
    print(value)

outer()