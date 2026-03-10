# expect: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]
def sieve(n):
    is_prime = []
    for i in range(n + 1):
        is_prime.append(True)
    is_prime[0] = False
    is_prime[1] = False
    p = 2
    while p * p <= n:
        if is_prime[p]:
            m = p * p
            while m <= n:
                is_prime[m] = False
                m += p
        p += 1
    primes = []
    for i in range(n + 1):
        if is_prime[i]:
            primes.append(i)
    return primes

print(sieve(30))
