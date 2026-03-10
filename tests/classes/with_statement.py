# expect: enter
# expect: value
# expect: exit None None
# expect: enter
# expect: no alias
# expect: exit None None
class Manager:
    def __enter__(self):
        print("enter")
        return "value"

    def __exit__(self, exc_type, exc, tb):
        print("exit", exc_type, exc)
        return False

with Manager() as item:
    print(item)

with Manager():
    print("no alias")