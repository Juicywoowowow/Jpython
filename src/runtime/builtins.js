import { PyInt } from '../vm/objects/py-int.js';
import { PyFloat } from '../vm/objects/py-float.js';
import { PyString } from '../vm/objects/py-string.js';
import { PyBool } from '../vm/objects/py-bool.js';
import { PyList } from '../vm/objects/py-list.js';
import { NONE } from '../vm/objects/py-none.js';
import { PyObject } from '../vm/objects/py-object.js';
import { PyClass, PyInstance } from '../vm/objects/py-class.js';
import { PySuper } from '../vm/objects/py-super.js';

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

function asRangeInt(obj) {
  if (obj.type === 'int') return obj.value;
  if (obj.type === 'bool') return obj.value ? 1 : 0;
  throw new Error(`TypeError: '${obj.type}' object cannot be interpreted as an integer`);
}

class PyBuiltin extends PyObject {
  constructor(name, fn) {
    super('builtin_function_or_method');
    this.name = name;
    this.fn = fn;
  }

  __call__(args, kwargs, vm, env) {
    if (kwargs && kwargs.length > 0) {
      throw new Error(`TypeError: ${this.name}() does not accept keyword arguments`);
    }
    return this.fn(args, vm, env);
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

    range: new PyBuiltin('range', (args) => {
      if (args.length < 1 || args.length > 3) {
        throw new Error('TypeError: range() expects 1 to 3 arguments');
      }

      let start = 0;
      let stop = 0;
      let step = 1;

      if (args.length === 1) {
        stop = asRangeInt(args[0]);
      } else if (args.length === 2) {
        start = asRangeInt(args[0]);
        stop = asRangeInt(args[1]);
      } else {
        start = asRangeInt(args[0]);
        stop = asRangeInt(args[1]);
        step = asRangeInt(args[2]);
      }

      if (step === 0) {
        throw new Error('ValueError: range() arg 3 must not be zero');
      }

      const items = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) items.push(new PyInt(i));
      } else {
        for (let i = start; i > stop; i += step) items.push(new PyInt(i));
      }
      return new PyList(items);
    }),

    super: new PyBuiltin('super', (args, vm, env) => {
      if (args.length === 0) {
        const currentFunction = env?.currentFunction;
        if (!currentFunction || currentFunction.params.length === 0) {
          throw new Error('RuntimeError: super(): no arguments');
        }

        let currentClass;
        try {
          currentClass = env.get('__class__');
        } catch {
          throw new Error('RuntimeError: super(): no current class');
        }

        if (!(currentClass instanceof PyClass)) {
          throw new Error('TypeError: super(): __class__ is not a type');
        }

        const receiverName = currentFunction.params[0];
        const receiver = env.getLocal(receiverName);
        if (!(receiver instanceof PyInstance)) {
          throw new Error('TypeError: super(): obj must be an instance');
        }

        return new PySuper(receiver, currentClass);
      }

      if (args.length !== 2) {
        throw new Error('TypeError: super() takes 0 or 2 arguments');
      }

      const [startClass, receiver] = args;
      if (!(startClass instanceof PyClass)) {
        throw new Error(`TypeError: super() argument 1 must be type, not ${startClass?.type}`);
      }
      if (!(receiver instanceof PyInstance)) {
        throw new Error(`TypeError: super() argument 2 must be instance, not ${receiver?.type}`);
      }

      return new PySuper(receiver, startClass);
    }),
  };
}
