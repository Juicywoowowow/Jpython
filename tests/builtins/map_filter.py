# expect: [1, 4, 9]
# expect: [2, 4, 6]
def square(x):
    return x * x

print(list(map(square, [1, 2, 3])))

def is_even(x):
    return x % 2 == 0

print(list(filter(is_even, [1, 2, 3, 4, 5, 6])))
