# expect: 57
def inc(x):
    return x + 1

data = [10, 20, 30]
print((inc(1) + inc(2)) * (data[1] - data[0]) + {'a': 5, 'b': 7}['b'])