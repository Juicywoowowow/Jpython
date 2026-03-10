# expect: 2
# expect: 1
a = 1
b = 2
a, b = b, a
print(a)
print(b)
