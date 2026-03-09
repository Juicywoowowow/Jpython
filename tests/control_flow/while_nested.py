# expect: 0 0
# expect: 0 1
# expect: 1 0
# expect: 1 1
i = 0
while i < 2:
    j = 0
    while j < 2:
        print(i, j)
        j = j + 1
    i = i + 1
