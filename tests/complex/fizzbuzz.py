# expect: 1
# expect: 2
# expect: Fizz
# expect: 4
# expect: Buzz
# expect: Fizz
# expect: 7
# expect: 8
# expect: Fizz
# expect: Buzz
# expect: 11
# expect: Fizz
# expect: 13
# expect: 14
# expect: FizzBuzz
def fizzbuzz(n):
    for i in range(1, n + 1):
        result = ""
        if i % 3 == 0:
            result += "Fizz"
        if i % 5 == 0:
            result += "Buzz"
        if result == "":
            result = str(i)
        print(result)

fizzbuzz(15)
