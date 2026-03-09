# expect: 3
def total(items):
    result = 0
    for item in items:
        result = result + item
    return result

print(total([1, 1, 1]))