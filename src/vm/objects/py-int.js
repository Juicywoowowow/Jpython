import { PyObject } from './py-object.js';

export class PyInt extends PyObject {
  constructor(value) {
    super('int');
    this.value = value | 0;
  }

  __repr__() {
    return String(this.value);
  }

  __str__() {
    return String(this.value);
  }

  __bool__() {
    return this.value !== 0;
  }

  __eq__(other) {
    if (other instanceof PyInt) return this.value === other.value;
    if (other.type === 'float') return this.value === other.value;
    if (other.type === 'bool') return this.value === (other.value ? 1 : 0);
    return false;
  }
}
