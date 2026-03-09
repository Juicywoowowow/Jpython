import { PyObject } from './py-object.js';

export class PyBool extends PyObject {
  constructor(value) {
    super('bool');
    this.value = value;
  }

  __repr__() {
    return this.value ? 'True' : 'False';
  }

  __str__() {
    return this.__repr__();
  }

  __bool__() {
    return this.value;
  }

  __eq__(other) {
    if (other instanceof PyBool) return this.value === other.value;
    return false;
  }
}
