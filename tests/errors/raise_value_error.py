# expect: caught value error
try:
    raise ValueError("bad value")
except ValueError:
    print("caught value error")
