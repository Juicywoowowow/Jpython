# expect: [-1, 0, 1, 2, 4, 5, 5, 8]
# expect: [-1, 0, 1, 2, 4, 5, 5, 8]
# expect: [1]
def bubble_sort(values):
    n = len(values)
    while n > 1:
        i = 0
        while i < n - 1:
            if values[i] > values[i + 1]:
                temp = values[i]
                values[i] = values[i + 1]
                values[i + 1] = temp
            i = i + 1
        n = n - 1
    return values

data = [5, 1, 4, 2, 8, 5, 0, -1]
print(bubble_sort(data))
print(data)
print(bubble_sort([1]))