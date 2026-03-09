import { PyObject } from './py-object.js';
import { NONE } from './py-none.js';

export class PyInstance extends PyObject {
  constructor(klass) {
    super(klass.name);
    this.klass = klass;
    this.attrs = new Map();
    this.vm = null;
  }

  __getattr__(name) {
    if (this.attrs.has(name)) {
      return this.attrs.get(name);
    }

    const method = this.klass.resolve(name);
    if (method !== undefined) {
      if (typeof method.__call__ === 'function') {
        return new PyBoundMethod(this, method);
      }
      return method;
    }

    throw new Error(`AttributeError: '${this.klass.name}' object has no attribute '${name}'`);
  }

  __setattr__(name, value) {
    this.attrs.set(name, value);
  }

  invokeMagicMethod(name, args = []) {
    const method = this.klass.resolve(name);
    if (!method || typeof method.__call__ !== 'function' || !this.vm) {
      return undefined;
    }
    return new PyBoundMethod(this, method).__call__(args, [], this.vm);
  }

  __repr__() {
    const result = this.invokeMagicMethod('__repr__');
    if (result !== undefined) {
      return result.__str__();
    }
    return `<${this.klass.name} instance>`;
  }

  __str__() {
    const result = this.invokeMagicMethod('__str__');
    if (result !== undefined) {
      return result.__str__();
    }
    return this.__repr__();
  }

  __bool__() {
    const result = this.invokeMagicMethod('__bool__');
    if (result !== undefined) {
      return result.__bool__();
    }

    const lenResult = this.invokeMagicMethod('__len__');
    if (lenResult !== undefined) {
      return lenResult.value !== 0;
    }

    return true;
  }

  __eq__(other) {
    const result = this.invokeMagicMethod('__eq__', [other]);
    if (result !== undefined) {
      return result.__bool__();
    }
    return this === other;
  }

  __len__() {
    const result = this.invokeMagicMethod('__len__');
    if (result !== undefined) {
      return result.value;
    }
    throw new Error(`TypeError: object of type '${this.klass.name}' has no len()`);
  }

  __add__(other) {
    const result = this.invokeMagicMethod('__add__', [other]);
    if (result !== undefined) {
      return result;
    }
    throw new Error(`TypeError: unsupported operand type(s) for +: '${this.klass.name}' and '${other?.type}'`);
  }

  __getitem__(index) {
    const result = this.invokeMagicMethod('__getitem__', [index]);
    if (result !== undefined) {
      return result;
    }
    throw new Error(`TypeError: '${this.klass.name}' object is not subscriptable`);
  }
}

export class PyClass extends PyObject {
  constructor(name, bases, namespace) {
    super('type');
    this.name = name;
    this.bases = bases;
    this.namespace = namespace; // Map<string, PyObject>
    this._mro = null;
  }

  get mro() {
    if (!this._mro) {
      this._mro = computeMRO(this);
    }
    return this._mro;
  }

  resolve(name) {
    for (const klass of this.mro) {
      if (klass.namespace.has(name)) {
        return klass.namespace.get(name);
      }
    }
    return undefined;
  }

  __call__(args, kwargs, vm) {
    const instance = new PyInstance(this);
    instance.vm = vm;

    const init = this.resolve('__init__');
    if (init && typeof init.__call__ === 'function') {
      const boundInit = new PyBoundMethod(instance, init);
      boundInit.__call__(args, kwargs, vm);
    } else if (args.length > 0) {
      throw new Error(`TypeError: ${this.name}() takes no arguments`);
    }

    return instance;
  }

  __repr__() {
    return `<class '${this.name}'>`;
  }

  __str__() {
    return this.__repr__();
  }

  __bool__() {
    return true;
  }
}

export class PyBoundMethod extends PyObject {
  constructor(instance, func) {
    super('method');
    this.instance = instance;
    this.func = func;
  }

  __call__(args, kwargs, vm) {
    return this.func.__call__([this.instance, ...args], kwargs, vm);
  }

  __repr__() {
    return `<bound method ${this.func.name} of ${this.instance.__repr__()}>`;
  }
}

function computeMRO(cls) {
  if (cls.bases.length === 0) {
    return [cls];
  }

  // C3 linearization
  const seqs = cls.bases.map(base => [...base.mro]);
  seqs.push([...cls.bases]);

  const result = [cls];

  while (seqs.some(s => s.length > 0)) {
    let head = null;

    for (const seq of seqs) {
      if (seq.length === 0) continue;
      const candidate = seq[0];
      const inTail = seqs.some(s => s.indexOf(candidate) > 0);
      if (!inTail) {
        head = candidate;
        break;
      }
    }

    if (head === null) {
      throw new Error(`TypeError: Cannot create a consistent method resolution order (MRO) for '${cls.name}'`);
    }

    result.push(head);
    for (const seq of seqs) {
      const idx = seq.indexOf(head);
      if (idx !== -1) seq.splice(idx, 1);
    }
  }

  return result;
}
