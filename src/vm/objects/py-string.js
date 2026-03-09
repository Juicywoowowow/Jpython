import { PyObject } from './py-object.js';
import { pythonError } from '../../runtime/errors.js';
import { resolveSliceIndices } from './slice-utils.js';

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

  __getitem__(index) {
    const i = index.value;
    const actual = i < 0 ? this.value.length + i : i;
    if (actual < 0 || actual >= this.value.length) {
      throw pythonError('IndexError', 'string index out of range');
    }
    return new PyString(this.value[actual]);
  }

  __getslice__(start, stop, step) {
    const indices = resolveSliceIndices(this.value.length, start, stop, step);
    return new PyString(indices.map(i => this.value[i]).join(''));
  }

  __contains__(value) {
    if (value.type !== 'str') {
      throw pythonError('TypeError', `'in <string>' requires string as left operand, not '${value.type}'`);
    }
    return this.value.includes(value.value);
  }
}
