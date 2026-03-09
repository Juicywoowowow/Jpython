# expect: fallback
# expect: value
# expect: [1, 2]
# expect: None
print([] or "fallback")
print([1] and "value")
print("" or [1, 2])
print(None and "nope")