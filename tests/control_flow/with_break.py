# expect: loop 0
# expect: exit
# expect: after
class Manager:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        print("exit")
        return False

i = 0
while True:
    with Manager():
        print("loop", i)
        break
    i = i + 1

print("after")