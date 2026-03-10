# expect: [58, 64]
# expect: [139, 154]
def mat_mul(a, b):
    rows_a = len(a)
    cols_b = len(b[0])
    cols_a = len(a[0])
    result = []
    for i in range(rows_a):
        row = []
        for j in range(cols_b):
            s = 0
            for k in range(cols_a):
                s += a[i][k] * b[k][j]
            row.append(s)
        result.append(row)
    return result

a = [[1, 2, 3], [4, 5, 6]]
b = [[7, 8], [9, 10], [11, 12]]
r = mat_mul(a, b)
for row in r:
    print(row)
