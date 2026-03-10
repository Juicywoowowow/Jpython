# expect: 1 odd
# expect: 2 even
# expect: 3 odd
# expect: 4 even
# expect: 5 odd
for i in range(1, 6):
    label = "even" if i % 2 == 0 else "odd"
    print(str(i) + " " + label)
