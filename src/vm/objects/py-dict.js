import { PyObject } from './py-object.js';
import { keyId } from './hash-key.js';
import { pythonError } from '../../runtime/errors.js';

export class PyDict extends PyObject {
  constructor(entries = []) {
    super('dict');
    this.entries = new Map();
    for (const [key, value] of entries) {
      this.__setitem__(key, value);
    }
  }

  __repr__() {
    return '{' + [...this.entries.values()]
      .map(({ key, value }) => `${key.__repr__()}: ${value.__repr__()}`)
      .join(', ') + '}';
  }

  __str__() {
    return this.__repr__();
  }

  __bool__() {
    return this.entries.size > 0;
  }

  __len__() {
    return this.entries.size;
  }

  __eq__(other) {
    if (!(other instanceof PyDict)) return false;
    if (this.entries.size !== other.entries.size) return false;

    for (const [id, { value }] of this.entries.entries()) {
      const otherEntry = other.entries.get(id);
      if (!otherEntry || !value.__eq__(otherEntry.value)) {
        return false;
      }
    }
    return true;
  }

  __getitem__(key) {
    const id = keyId(key);
    const entry = this.entries.get(id);
    if (!entry) {
      throw pythonError('KeyError', key.__repr__());
    }
    return entry.value;
  }

  __setitem__(key, value) {
    const id = keyId(key);
    const existing = this.entries.get(id);
    if (existing) {
      existing.value = value;
    } else {
      this.entries.set(id, { key, value });
    }
  }

  __contains__(key) {
    return this.entries.has(keyId(key));
  }
}