# expect: 12
# expect: 16
# expect: 101
def make_counter(start=0, step=1):
    value = start

    def advance(times=1):
        nonlocal value
        i = 0
        while i < times:
            value = value + step
            i = i + 1
        return value

    return advance

counter = make_counter(10, step=2)
print(counter())
print(counter(2))
other = make_counter(100)
print(other())