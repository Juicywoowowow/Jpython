# expect: 6
def outer():
    def sum_to(n):
        if n <= 0:
            return 0
        return n + sum_to(n - 1)

    return sum_to(3)

print(outer())