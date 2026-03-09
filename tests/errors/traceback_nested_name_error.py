# expect_error: Traceback (most recent call last):
# expect_error: in <module>
# expect_error: in outer
# expect_error: in inner
# expect_error: NameError: name 'missing' is not defined
def inner():
    return missing

def outer():
    return inner()

print(outer())