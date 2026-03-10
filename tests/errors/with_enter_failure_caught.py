# expect: enter
# expect: caught enter failed
class Manager:
    def __enter__(self):
        print("enter")
        raise ValueError("enter failed")

    def __exit__(self, exc_type, exc, tb):
        print("exit")
        return False

try:
    with Manager():
        print("body")
except ValueError as e:
    print("caught", e)
