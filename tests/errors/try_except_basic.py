# expect: caught
# expect: after
try:
    x = 1 / 0
except:
    print("caught")
print("after")
