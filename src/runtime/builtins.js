import { PyInt } from '../vm/objects/py-int.js';
import { PyFloat } from '../vm/objects/py-float.js';
import { PyString } from '../vm/objects/py-string.js';
import { PyBool } from '../vm/objects/py-bool.js';
import { NONE } from '../vm/objects/py-none.js';
import { PyObject } from '../vm/objects/py-object.js';

const INT_PATTERN = /^[+-]?[0-9]+$/;
const FLOAT_PATTERN = /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;

function parseStrictInt(value) {
  const trimmed = value.trim();
  if (!INT_PATTERN.test(trimmed)) {
    throw new Error(`ValueError: invalid literal for int(): '${value}'`);
  }
  return new PyInt(Number.parseInt(trimmed, 10));
}

function parseStrictFloat(value) {
  const trimmed = value.trim();
  if (!FLOAT_PATTERN.test(trimmed)) {
    throw new Error(`ValueError: could not convert string to float: '${value}'`);
  }
  return new PyFloat(Number.parseFloat(trimmed));
}

class PyBuiltin extends PyObject {
  constructor(name, fn) {
    super('builtin_function_or_method');
    this.name = name;
    this.fn = fn;
  }

  __call__(args) {
    return this.fn(args);
  }

  __repr__() {
    return `<built-in function ${this.name}>`;
  }
}

export function createBuiltins() {
  return {
    len: new PyBuiltin('len', (args) => {
      if (args.length !== 1) throw new Error('TypeError: len() takes exactly one argument');
      const obj = args[0];
      if (typeof obj.__len__ === 'function') return new PyInt(obj.__len__());
      throw new Error(`TypeError: object of type '${obj.type}' has no len()`);
    }),

    type: new PyBuiltin('type', (args) => {
      if (args.length !== 1) throw new Error('TypeError: type() takes exactly one argument');
      return new PyString(`<class '${args[0].type}'>`);
    }),

    str: new PyBuiltin('str', (args) => {
      if (args.length !== 1) throw new Error('TypeError: str() takes exactly one argument');
      return new PyString(args[0].__str__());
    }),

    int: new PyBuiltin('int', (args) => {
      if (args.length !== 1) throw new Error('TypeError: int() takes exactly one argument');
      const obj = args[0];
      if (obj.type === 'int') return obj;
      if (obj.type === 'float') return new PyInt(Math.trunc(obj.value));
      if (obj.type === 'str') return parseStrictInt(obj.value);
      if (obj.type === 'bool') return new PyInt(obj.value ? 1 : 0);
      throw new Error(`TypeError: int() argument must be a string or a number`);
    }),

    float: new PyBuiltin('float', (args) => {
      if (args.length !== 1) throw new Error('TypeError: float() takes exactly one argument');
      const obj = args[0];
      if (obj.type === 'float') return obj;
      if (obj.type === 'int') return new PyFloat(obj.value);
      if (obj.type === 'str') return parseStrictFloat(obj.value);
      if (obj.type === 'bool') return new PyFloat(obj.value ? 1.0 : 0.0);
      throw new Error(`TypeError: float() argument must be a string or a number`);
    }),

    bool: new PyBuiltin('bool', (args) => {
      if (args.length !== 1) throw new Error('TypeError: bool() takes exactly one argument');
      return new PyBool(args[0].__bool__());
    }),

    abs: new PyBuiltin('abs', (args) => {
      if (args.length !== 1) throw new Error('TypeError: abs() takes exactly one argument');
      const obj = args[0];
      if (obj.type === 'int') return new PyInt(Math.abs(obj.value));
      if (obj.type === 'float') return new PyFloat(Math.abs(obj.value));
      throw new Error(`TypeError: bad operand type for abs(): '${obj.type}'`);
    }),
  };
}
