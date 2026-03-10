# expect: (0, 'a')
# expect: (1, 'b')
# expect: (1, 'x')
# expect: (2, 'y')
for pair in enumerate(["a", "b"]):
    print(pair)
for pair in enumerate(["x", "y"], 1):
    print(pair)
