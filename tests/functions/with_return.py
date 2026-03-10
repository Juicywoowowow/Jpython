# expect: body
# expect: exit
# expect: done
class Manager:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        print("exit")
        return False

def run():
    with Manager():
        print("body")
        return "done"

print(run())