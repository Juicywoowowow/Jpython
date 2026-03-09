import { PyObject } from './py-object.js';
import { PyBoundMethod } from './py-class.js';

export class PySuper extends PyObject {
  constructor(instance, startClass) {
    super('super');
    this.instance = instance;
    this.startClass = startClass;
  }

  __getattr__(name) {
    const mro = this.instance.klass.mro;
    const startIdx = mro.indexOf(this.startClass);
    if (startIdx === -1) {
      throw new Error(`TypeError: super(): class not in MRO`);
    }

    for (let i = startIdx + 1; i < mro.length; i++) {
      const klass = mro[i];
      if (klass.namespace.has(name)) {
        const val = klass.namespace.get(name);
        if (typeof val.__call__ === 'function') {
          return new PyBoundMethod(this.instance, val);
        }
        return val;
      }
    }

    throw new Error(`AttributeError: 'super' object has no attribute '${name}'`);
  }

  __repr__() {
    return '<super>';
  }
}
