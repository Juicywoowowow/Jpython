# expect: 0
# expect: 1
# expect: 8
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(0))
print(fib(1))
print(fib(6))