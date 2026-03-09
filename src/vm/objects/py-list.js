import { PyObject } from './py-object.js';
import { pythonError } from '../../runtime/errors.js';
import { resolveSliceIndices } from './slice-utils.js';

export class PyList extends PyObject {
  constructor(items = []) {
    super('list');
    this.items = items;
  }

  __repr__() {
    return '[' + this.items.map(i => i.__repr__()).join(', ') + ']';
  }

  __str__() {
    return this.__repr__();
  }

  __bool__() {
    return this.items.length > 0;
  }

  __eq__(other) {
    if (!(other instanceof PyList)) return false;
    if (this.items.length !== other.items.length) return false;
    return this.items.every((item, i) => item.__eq__(other.items[i]));
  }

  __len__() {
    return this.items.length;
  }

  __getitem__(index) {
    const i = index.value;
    const actual = i < 0 ? this.items.length + i : i;
    if (actual < 0 || actual >= this.items.length) {
      throw pythonError('IndexError', 'list index out of range');
    }
    return this.items[actual];
  }

  __setitem__(index, value) {
    const i = index.value;
    const actual = i < 0 ? this.items.length + i : i;
    if (actual < 0 || actual >= this.items.length) {
      throw pythonError('IndexError', 'list assignment index out of range');
    }
    this.items[actual] = value;
  }

  __getslice__(start, stop, step) {
    const indices = resolveSliceIndices(this.items.length, start, stop, step);
    return new PyList(indices.map(i => this.items[i]));
  }

  __contains__(value) {
    return this.items.some(item => item.__eq__(value));
  }
}
