# expect: 32
def dot_product(a, b):
    result = 0
    for i in range(len(a)):
        result += a[i] * b[i]
    return result

print(dot_product([1, 2, 3], [4, 5, 6]))
