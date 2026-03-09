# expect: [4, 5, 5, 6]
print([x + y for x in [1, 2, 3] if x > 1 for y in [2, 3] if y > 1])
