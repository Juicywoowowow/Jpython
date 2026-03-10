# expect: True
# expect: False
# expect: 'hello'
# expect: 42
def foo():
    pass

print(callable(foo))
print(callable(42))
print(repr("hello"))
print(repr(42))
