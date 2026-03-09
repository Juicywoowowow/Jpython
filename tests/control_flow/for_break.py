# expect: 0
# expect: 1
# expect: done
for i in range(5):
    if i == 2:
        break
    print(i)
print("done")