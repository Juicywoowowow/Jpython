# expect: enter outer
# expect: enter inner
# expect: body
# expect: exit inner
# expect: exit outer
class Manager:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        print("enter", self.name)
        return self

    def __exit__(self, exc_type, exc, tb):
        print("exit", self.name)
        return False

with Manager("outer"):
    with Manager("inner"):
        print("body")
