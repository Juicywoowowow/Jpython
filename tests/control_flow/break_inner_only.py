# expect: inner stopped
# expect: outer 0
# expect: inner stopped
# expect: outer 1
i = 0
while i < 2:
    j = 0
    while j < 3:
        if j == 1:
            print("inner stopped")
            break
        j = j + 1
    print("outer", i)
    i = i + 1