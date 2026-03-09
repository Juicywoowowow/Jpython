# expect: 1
# expect: 3
# expect: done
i = 0
while i < 4:
    i = i + 1
    if i == 2:
        continue
    if i == 4:
        continue
    print(i)
print("done")