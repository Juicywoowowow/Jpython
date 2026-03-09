# expect: got: bad value
try:
    raise ValueError("bad value")
except ValueError as e:
    print("got: " + str(e))
