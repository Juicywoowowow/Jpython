# expect: caught type error
try:
    raise TypeError("wrong type")
except ValueError:
    print("caught value error")
except TypeError:
    print("caught type error")
