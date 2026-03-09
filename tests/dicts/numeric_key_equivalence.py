# expect: {1: 'bool', None: 'none', 'x': 'str'}
# expect: bool
data = {1: 'int', 1.0: 'float', True: 'bool', None: 'none', 'x': 'str'}
print(data)
print(data[1])