# expect_error: ValueError
# expect_error: boom
# expect: exit <class 'ValueError'> boom
class Manager:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        print("exit", exc_type, exc)
        return False

with Manager():
    raise ValueError("boom")