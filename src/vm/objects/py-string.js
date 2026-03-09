import { PyObject } from './py-object.js';

export class PyString extends PyObject {
  constructor(value) {
    super('str');
    this.value = value;
  }

  __repr__() {
    return `'${this.value}'`;
  }

  __str__() {
    return this.value;
  }

  __bool__() {
    return this.value.length > 0;
  }

  __eq__(other) {
    if (other instanceof PyString) return this.value === other.value;
    return false;
  }

  __len__() {
    return this.value.length;
  }
}
