# expect: (1, 'a')
# expect: (2, 'b')
# expect: (3, 'c')
for pair in zip([1, 2, 3], ["a", "b", "c"]):
    print(pair)
