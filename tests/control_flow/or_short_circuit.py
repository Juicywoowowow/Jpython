# expect: True
# expect: 9
print(True or (1 / 0))
print(False or 9)