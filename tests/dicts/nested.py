# expect: 3
# expect: {'items': [1, 2], 'inner': {'count': 3}}
data = {'items': [1, 2], 'inner': {'count': 3}}
print(data['inner']['count'])
print(data)