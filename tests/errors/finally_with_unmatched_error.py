# expect_error: TypeError
# expect: try
# expect: finally
try:
    print("try")
    raise TypeError("oops")
except ValueError:
    print("except")
finally:
    print("finally")
