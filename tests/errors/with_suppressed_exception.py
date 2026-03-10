# expect: inside
# expect: exit <class 'ValueError'> boom
# expect: after
class Manager:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        print("exit", exc_type, exc)
        return True

with Manager():
    print("inside")
    raise ValueError("boom")

print("after")