# expect: 10
# expect: 11
x = 10

def bump():
    global x
    print(x)
    x = x + 1

bump()
print(x)