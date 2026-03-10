# expect: side
# expect: done
def noisy():
    print("side")
    return 1

value = noisy()
print("done")