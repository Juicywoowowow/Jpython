# expect_error: ValueError
# expect: try
# expect: finally
try:
    print("try")
    raise ValueError("oops")
finally:
    print("finally")
