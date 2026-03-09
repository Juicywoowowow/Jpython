# expect: False
# expect: yes
# expect: 5
print(False and (missing_name or 1))
print("yes" or (missing_name and 1))
print(0 or (False or 5))