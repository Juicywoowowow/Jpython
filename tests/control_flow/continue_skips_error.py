# expect: 1
# expect: done
i = 0
while i < 2:
    i = i + 1
    if i == 2:
        continue
        print(1 / 0)
    print(i)
print("done")