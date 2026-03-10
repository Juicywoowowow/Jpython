# expect: body
# expect: exit inner
# expect: exit outer
# expect: result
class Manager:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        print("exit", self.name)
        return False

def run():
    with Manager("outer"):
        with Manager("inner"):
            print("body")
            return "result"

print(run())