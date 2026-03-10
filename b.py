def bubble_sort_optimized(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

# --- Test Block ---
data = [64, 34, 25, 12, 22, 11, 90]

# Printing the unsorted array
print("Unsorted array:", data)

# Sorting a copy to preserve the original for the printout
sorted_data = bubble_sort_optimized(list(data))

# Printing the sorted array using .format()
print("Sorted array:   {}".format(sorted_data))
