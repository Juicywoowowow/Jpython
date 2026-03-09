# expect: kept
i = 0
while i < 1:
    i = i + 1
    continue
    print("skipped")
print("kept")