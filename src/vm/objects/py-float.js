import { PyObject } from './py-object.js';

export class PyFloat extends PyObject {
  constructor(value) {
    super('float');
    this.value = value;
  }

  __repr__() {
    const s = String(this.value);
    return s.includes('.') ? s : s + '.0';
  }

  __str__() {
    return this.__repr__();
  }

  __bool__() {
    return this.value !== 0.0;
  }

  __eq__(other) {
    if (other.type === 'int' || other.type === 'float') return this.value === other.value;
    return false;
  }
}
