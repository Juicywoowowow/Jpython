# expect: 1
# expect: 3
for i in range(5):
    if i % 2 == 0:
        continue
    print(i)