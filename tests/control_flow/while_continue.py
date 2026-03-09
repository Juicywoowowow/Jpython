# expect: 1
# expect: 3
# expect: 5
i = 0
while i < 5:
    i = i + 1
    if i % 2 == 0:
        continue
    print(i)