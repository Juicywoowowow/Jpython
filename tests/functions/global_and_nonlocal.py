# expect: 6
# expect: 6
total = 0

def accumulate(values):
    subtotal = 0

    def add_one(value):
        nonlocal subtotal
        global total
        subtotal = subtotal + value
        total = total + value

    for value in values:
        add_one(value)

    return subtotal

print(accumulate([1, 2, 3]))
print(total)