# expect: 0 0
# expect: 0 2
# expect: 1 0
# expect: 1 2
i = 0
while i < 2:
    j = 0
    while j < 4:
        j = j + 1
        if j == 2:
            continue
        if j == 4:
            break
        print(i, j - 1)
    i = i + 1