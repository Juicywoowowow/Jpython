# expect: None
def outer():
    def inner():
        return 1

print(outer())