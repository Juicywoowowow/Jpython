import { PyObject, PyBuiltinMethod } from './py-object.js';
import { pythonError } from '../../runtime/errors.js';
import { resolveSliceIndices } from './slice-utils.js';
import { NONE } from './py-none.js';
import { PyInt } from './py-int.js';

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

  __getattr__(name) {
    const self = this;
    switch (name) {
      case 'append':
        return new PyBuiltinMethod('list.append', (args) => {
          if (args.length !== 1) throw pythonError('TypeError', 'append() takes exactly one argument');
          self.items.push(args[0]);
          return NONE;
        });
      case 'pop':
        return new PyBuiltinMethod('list.pop', (args) => {
          if (args.length === 0) {
            if (self.items.length === 0) throw pythonError('IndexError', 'pop from empty list');
            return self.items.pop();
          }
          const i = args[0].value;
          const actual = i < 0 ? self.items.length + i : i;
          if (actual < 0 || actual >= self.items.length) throw pythonError('IndexError', 'pop index out of range');
          return self.items.splice(actual, 1)[0];
        });
      case 'insert':
        return new PyBuiltinMethod('list.insert', (args) => {
          if (args.length !== 2) throw pythonError('TypeError', 'insert() takes exactly 2 arguments');
          let i = args[0].value;
          if (i < 0) i = Math.max(0, self.items.length + i);
          if (i > self.items.length) i = self.items.length;
          self.items.splice(i, 0, args[1]);
          return NONE;
        });
      case 'remove':
        return new PyBuiltinMethod('list.remove', (args) => {
          if (args.length !== 1) throw pythonError('TypeError', 'remove() takes exactly one argument');
          const idx = self.items.findIndex(item => item.__eq__(args[0]));
          if (idx === -1) throw pythonError('ValueError', 'list.remove(x): x not in list');
          self.items.splice(idx, 1);
          return NONE;
        });
      case 'index':
        return new PyBuiltinMethod('list.index', (args) => {
          if (args.length < 1) throw pythonError('TypeError', 'index() takes at least 1 argument');
          const idx = self.items.findIndex(item => item.__eq__(args[0]));
          if (idx === -1) throw pythonError('ValueError', 'is not in list');
          return new PyInt(idx);
        });
      case 'reverse':
        return new PyBuiltinMethod('list.reverse', () => {
          self.items.reverse();
          return NONE;
        });
      case 'sort':
        return new PyBuiltinMethod('list.sort', () => {
          self.items.sort((a, b) => {
            if ((a.type === 'int' || a.type === 'float') && (b.type === 'int' || b.type === 'float')) return a.value - b.value;
            if (a.type === 'str' && b.type === 'str') return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
            return 0;
          });
          return NONE;
        });
      case 'extend':
        return new PyBuiltinMethod('list.extend', (args) => {
          if (args.length !== 1) throw pythonError('TypeError', 'extend() takes exactly one argument');
          const other = args[0];
          if (other.type === 'list' || other.type === 'tuple') {
            for (const item of other.items) self.items.push(item);
          } else {
            throw pythonError('TypeError', `'${other.type}' object is not iterable`);
          }
          return NONE;
        });
      case 'count':
        return new PyBuiltinMethod('list.count', (args) => {
          if (args.length !== 1) throw pythonError('TypeError', 'count() takes exactly one argument');
          let c = 0;
          for (const item of self.items) if (item.__eq__(args[0])) c++;
          return new PyInt(c);
        });
      case 'clear':
        return new PyBuiltinMethod('list.clear', () => {
          self.items.length = 0;
          return NONE;
        });
      case 'copy':
        return new PyBuiltinMethod('list.copy', () => {
          return new PyList([...self.items]);
        });
      default:
        throw pythonError('AttributeError', `'list' object has no attribute '${name}'`);
    }
  }
}
