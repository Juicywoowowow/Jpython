# expect: [[2, 4], [4, 8], [6, 12]]
print([[x * y for x in range(1, 5) if x % 2 == 0] for y in [1, 2, 3]])
