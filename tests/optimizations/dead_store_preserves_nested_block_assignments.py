# expect: 3
# expect: 3
# expect: True
x = 2
if True:
    x = 3
print(x)

def show_if_value():
    value = 2
    if True:
        value = 3
    print(value)

def show_for_value():
    swapped = False
    for j in range(0, 2):
        swapped = True
    print(swapped)

show_if_value()
show_for_value()