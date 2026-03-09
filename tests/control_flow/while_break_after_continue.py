# expect: 1
# expect: final
i = 0
while i < 5:
    i = i + 1
    if i == 2:
        continue
    if i == 3:
        break
    print(i)
print("final")