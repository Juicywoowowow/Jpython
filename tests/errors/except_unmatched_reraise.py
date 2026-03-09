# expect_error: ValueError
# expect_error: oops
try:
    raise ValueError("oops")
except TypeError:
    print("wrong handler")
