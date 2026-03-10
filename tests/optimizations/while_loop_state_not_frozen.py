# expect: start 0
# expect: start 1
# expect: done 2
i = 0
while i < 2:
    print("start", i)
    i = i + 1

print("done", i)