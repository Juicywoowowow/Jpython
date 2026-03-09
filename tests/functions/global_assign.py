# expect: 5
x = 1

def set_x():
    global x
    x = 5

set_x()
print(x)