# expect: 20
# expect: 10
x = 10

def set_local():
    x = 20
    print(x)

set_local()
print(x)