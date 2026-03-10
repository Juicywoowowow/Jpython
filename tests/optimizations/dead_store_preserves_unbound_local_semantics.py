# expect_error: UnboundLocalError
x = 10

def bad():
    print(x)
    x = 20

bad()