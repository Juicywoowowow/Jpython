export class PyObject {
  constructor(type) {
    this.type = type;
  }

  __repr__() {
    return `<${this.type}>`;
  }

  __str__() {
    return this.__repr__();
  }

  __bool__() {
    return true;
  }
}
