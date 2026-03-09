# expect: 7
# expect: 7
def make_default():
    return 7

def use_default(x=make_default()):
    return x

print(use_default())
print(use_default())