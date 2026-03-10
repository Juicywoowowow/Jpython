# expect: inside
# expect: exit <class 'ValueError'> boom
# expect: caught boom
class Manager:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        print("exit", exc_type, exc)
        return False

try:
    with Manager():
        print("inside")
        raise ValueError("boom")
except ValueError as e:
    print("caught", e)
