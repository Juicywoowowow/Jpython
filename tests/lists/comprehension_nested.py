# expect: [[1, 2, 3], [2, 4, 6], [3, 6, 9]]
print([[x * y for x in [1, 2, 3]] for y in [1, 2, 3]])
