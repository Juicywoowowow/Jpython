# expect: caught division error
try:
    x = 1 / 0
except ZeroDivisionError:
    print("caught division error")
