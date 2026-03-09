# expect: safe
while True:
    break
    print(1 / 0)
print("safe")