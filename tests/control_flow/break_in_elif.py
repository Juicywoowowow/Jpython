# expect: 0
# expect: 2
# expect: stop
i = 0
while i < 5:
    if i == 0:
        print(i)
    elif i == 1:
        i = i + 1
        continue
    elif i == 2:
        print(i)
    else:
        break
    i = i + 1
print("stop")