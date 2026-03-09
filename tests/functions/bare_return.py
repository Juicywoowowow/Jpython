# expect: before
# expect: None
def stop():
    print("before")
    return
    print("after")

print(stop())