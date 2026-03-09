# expect: BCA
class A:
    def chain(self):
        return "A"

class B(A):
    def chain(self):
        return "B" + super().chain()

class C(A):
    def chain(self):
        return "C" + super().chain()

class D(B, C):
    pass

print(D().chain())

