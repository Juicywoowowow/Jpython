# expect: start 0
# expect: exit
# expect: start 1
# expect: exit
# expect: after 2
class Manager:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc, tb):
        print("exit")
        return False

i = 0
while i < 2:
    with Manager():
        print("start", i)
        i = i + 1
        continue

print("after", i)