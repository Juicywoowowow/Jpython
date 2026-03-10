import { pythonError } from '../../runtime/errors.js';

export class PyObject {
  constructor(type) {
    this.type = type;
  }

  __repr__() {
    return `<${this.type}>`;
  }

  __str__() {
    return this.__repr__();
  }

  __bool__() {
    return true;
  }
}

export class PyBuiltinMethod extends PyObject {
  constructor(name, fn, options = {}) {
    super('builtin_function_or_method');
    this.name = name;
    this.fn = fn;
    this.acceptsKeywords = options.acceptsKeywords ?? false;
  }

  __call__(args, kwargs, vm, env) {
    if (kwargs && kwargs.length > 0 && !this.acceptsKeywords) {
      throw pythonError('TypeError', `${this.name}() does not accept keyword arguments`);
    }
    return this.fn(args, kwargs, vm, env);
  }

  __repr__() {
    return `<built-in method ${this.name}>`;
  }
}
