# expect: 10
# expect: 10
grand_total = 0

def process(values):
    running = 0

    def visit_one(value):
        nonlocal running
        global grand_total
        running = running + value
        grand_total = grand_total + value

    for value in values:
        visit_one(value)

    return running

print(process([4, 1, 3, 2]))
print(grand_total)