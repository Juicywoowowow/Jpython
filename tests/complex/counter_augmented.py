# expect: a: 3
# expect: b: 2
# expect: c: 1
def count_chars(s):
    counts = {}
    for ch in s:
        if ch in counts:
            counts[ch] += 1
        else:
            counts[ch] = 1
    return counts

result = count_chars("abacab")
print("a: " + str(result["a"]))
print("b: " + str(result["b"]))
print("c: " + str(result["c"]))
