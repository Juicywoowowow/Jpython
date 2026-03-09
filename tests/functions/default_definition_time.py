# expect: 10
# expect: 10
x = 10

def show(value=x):
    return value

x = 99
print(show())
print(show(10))