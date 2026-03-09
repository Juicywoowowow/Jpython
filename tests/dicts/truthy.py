# expect: yes
# expect: empty
if {'a': 1}:
    print('yes')

if {}:
    print('no')
else:
    print('empty')