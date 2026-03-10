# expect: 3.14
# expect: >     3.5<
# expect: 42
# expect: jpyt
# expect: 'hi'
print("{:.2f}".format(3.14159))
print(">" + "{:8.1f}".format(3.5) + "<")
print("{:d}".format(42))
print("{:.4s}".format("jpython"))
print("{!r}".format("hi"))