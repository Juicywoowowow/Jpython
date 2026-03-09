# expect: [6, 12, 10, 20, 9, 18, 15, 30]
print([x * y * z for x in [2, 3] for y in [3, 5] for z in [1, 2]])
