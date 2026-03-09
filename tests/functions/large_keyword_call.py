# expect: 55
def score(a0=0, a1=0, a2=0, a3=0, a4=0, a5=0, a6=0, a7=0, a8=0, a9=0):
    return a0 + a1 + a2 + a3 + a4 + a5 + a6 + a7 + a8 + a9

print(score(a9=10, a8=9, a7=8, a6=7, a5=6, a4=5, a3=4, a2=3, a1=2, a0=1))