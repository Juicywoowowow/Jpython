# expect: [3, 2, 1]
arr = [1, 2, 3]
arr[0], arr[2] = arr[2], arr[0]
print(arr)
