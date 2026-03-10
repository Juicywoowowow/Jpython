# expect: worker
class Resource:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def name(self):
        return "worker"

with Resource() as resource:
    print(resource.name())
