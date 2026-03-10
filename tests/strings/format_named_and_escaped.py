# expect: answer=42, name=jpython
# expect: braces: {}
print("answer={answer}, name={name}".format(answer=42, name="jpython"))
print("braces: {{}}".format())