# expect: zero
# expect: positive
# expect: negative
def classify(n):
    return "zero" if n == 0 else "positive" if n > 0 else "negative"

print(classify(0))
print(classify(5))
print(classify(-3))
