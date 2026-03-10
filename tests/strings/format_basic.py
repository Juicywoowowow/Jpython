# expect: hello world 42
# expect: right left
# expect: Sorted array:   [11, 12, 22, 25, 34, 64, 90]
print("{} {} {}".format("hello", "world", 42))
print("{1} {0}".format("left", "right"))
print("Sorted array:   {}".format([11, 12, 22, 25, 34, 64, 90]))