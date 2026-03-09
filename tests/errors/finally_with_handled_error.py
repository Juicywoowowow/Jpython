# expect: try
# expect: except
# expect: finally
# expect: after
try:
    print("try")
    raise ValueError("oops")
except ValueError:
    print("except")
finally:
    print("finally")
print("after")
