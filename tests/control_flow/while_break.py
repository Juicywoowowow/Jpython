# expect: 0
# expect: 1
# expect: done
i = 0
while i < 5:
    if i == 2:
        break
    print(i)
    i = i + 1
print("done")