import { PyObject } from './py-object.js';
import { pythonError } from '../../runtime/errors.js';
import { resolveSliceIndices } from './slice-utils.js';

export class PyTuple extends PyObject {
  constructor(items = []) {
    super('tuple');
    this.items = items;
  }

  __repr__() {
    if (this.items.length === 1) {
      return `(${this.items[0].__repr__()},)`;
    }
    return '(' + this.items.map(item => item.__repr__()).join(', ') + ')';
  }

  __str__() {
    return this.__repr__();
  }

  __bool__() {
    return this.items.length > 0;
  }

  __len__() {
    return this.items.length;
  }

  __eq__(other) {
    if (!(other instanceof PyTuple)) return false;
    if (this.items.length !== other.items.length) return false;
    return this.items.every((item, i) => item.__eq__(other.items[i]));
  }

  __getitem__(index) {
    const i = index.value;
    const actual = i < 0 ? this.items.length + i : i;
    if (actual < 0 || actual >= this.items.length) {
      throw pythonError('IndexError', 'tuple index out of range');
    }
    return this.items[actual];
  }

  __getslice__(start, stop, step) {
    const indices = resolveSliceIndices(this.items.length, start, stop, step);
    return new PyTuple(indices.map(i => this.items[i]));
  }

  __contains__(value) {
    return this.items.some(item => item.__eq__(value));
  }
}