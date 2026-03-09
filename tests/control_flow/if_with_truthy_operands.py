# expect: branch1
# expect: branch2
if [] or [1]:
    print("branch1")
if "" and 1:
    print("no")
else:
    print("branch2")