# expect: 15
def make_adder(n):
    return lambda x: x + n

add5 = make_adder(5)
print(add5(10))

