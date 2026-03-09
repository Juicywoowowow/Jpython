# expect: inner caught
# expect: after
try:
    try:
        x = 1 / 0
    except:
        print("inner caught")
except:
    print("outer caught")
print("after")
