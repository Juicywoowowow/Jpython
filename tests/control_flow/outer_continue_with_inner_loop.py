# expect: 0 0
# expect: 0 1
# expect: 2 0
# expect: 2 1
i = 0
while i < 3:
    if i == 1:
        i = i + 1
        continue
    j = 0
    while j < 2:
        print(i, j)
        j = j + 1
    i = i + 1