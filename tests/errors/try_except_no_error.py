# expect: before
# expect: no error
# expect: after
print("before")
try:
    x = 42
except:
    print("error")
print("no error")
print("after")
