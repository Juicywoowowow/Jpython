# expect: 1
# expect: 2
# expect: 100
def bump(items=[0]):
    items[0] = items[0] + 1
    return items[0]

print(bump())
print(bump())
print(bump([99]))