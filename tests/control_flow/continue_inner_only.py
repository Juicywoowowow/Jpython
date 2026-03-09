# expect: 0 0
# expect: 0 2
# expect: 1 0
# expect: 1 2
i = 0
while i < 2:
    j = 0
    while j < 3:
        if j == 1:
            j = j + 1
            continue
        print(i, j)
        j = j + 1
    i = i + 1