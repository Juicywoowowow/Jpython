# expect: caught in inner
# expect: re-raised to outer
try:
    try:
        raise ValueError("test")
    except ValueError:
        print("caught in inner")
        raise
except ValueError:
    print("re-raised to outer")
