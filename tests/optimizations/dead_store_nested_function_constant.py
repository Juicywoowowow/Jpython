# expect: 9
def outer():
    base = 4

    def inner():
        temp = base + 5
        return temp

    return inner()

print(outer())