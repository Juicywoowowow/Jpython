import { PyInt } from '../vm/objects/py-int.js';
import { PyFloat } from '../vm/objects/py-float.js';
import { PyString } from '../vm/objects/py-string.js';
import { PyBool } from '../vm/objects/py-bool.js';
import { PyList } from '../vm/objects/py-list.js';
import { PyTuple } from '../vm/objects/py-tuple.js';
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

function toItems(obj) {
  if (obj.type === 'list' || obj.type === 'tuple') return obj.items;
  if (obj.type === 'str') return [...obj.value].map(c => new PyString(c));
  if (obj.type === 'dict') return [...obj.entries.keys()];
  throw new Error(`TypeError: '${obj.type}' object is not iterable`);
}

function numericVal(obj) {
  if (obj.type === 'int' || obj.type === 'float') return obj.value;
  if (obj.type === 'bool') return obj.value ? 1 : 0;
  return null;
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

    min: new PyBuiltin('min', (args) => {
      let items;
      if (args.length === 1) {
        items = toItems(args[0]);
      } else {
        items = args;
      }
      if (items.length === 0) throw new Error('ValueError: min() arg is an empty sequence');
      let best = items[0];
      for (let i = 1; i < items.length; i++) {
        const bv = numericVal(best), iv = numericVal(items[i]);
        if (bv !== null && iv !== null) {
          if (iv < bv) best = items[i];
        } else if (items[i].type === 'str' && best.type === 'str') {
          if (items[i].value < best.value) best = items[i];
        }
      }
      return best;
    }),

    max: new PyBuiltin('max', (args) => {
      let items;
      if (args.length === 1) {
        items = toItems(args[0]);
      } else {
        items = args;
      }
      if (items.length === 0) throw new Error('ValueError: max() arg is an empty sequence');
      let best = items[0];
      for (let i = 1; i < items.length; i++) {
        const bv = numericVal(best), iv = numericVal(items[i]);
        if (bv !== null && iv !== null) {
          if (iv > bv) best = items[i];
        } else if (items[i].type === 'str' && best.type === 'str') {
          if (items[i].value > best.value) best = items[i];
        }
      }
      return best;
    }),

    sum: new PyBuiltin('sum', (args) => {
      if (args.length < 1 || args.length > 2) throw new Error('TypeError: sum() takes 1 or 2 arguments');
      const items = toItems(args[0]);
      let total = args.length === 2 ? numericVal(args[1]) : 0;
      if (total === null) throw new Error("TypeError: sum() can't sum strings");
      let isFloat = args.length === 2 && args[1].type === 'float';
      for (const item of items) {
        const v = numericVal(item);
        if (v === null) throw new Error("TypeError: unsupported operand type(s) for +");
        if (item.type === 'float') isFloat = true;
        total += v;
      }
      return isFloat ? new PyFloat(total) : new PyInt(total);
    }),

    enumerate: new PyBuiltin('enumerate', (args) => {
      if (args.length < 1 || args.length > 2) throw new Error('TypeError: enumerate() takes 1 or 2 arguments');
      const items = toItems(args[0]);
      let start = args.length === 2 ? asRangeInt(args[1]) : 0;
      return new PyList(items.map((item, i) => new PyTuple([new PyInt(start + i), item])));
    }),

    zip: new PyBuiltin('zip', (args) => {
      if (args.length === 0) return new PyList([]);
      const iterables = args.map(a => toItems(a));
      const minLen = Math.min(...iterables.map(it => it.length));
      const result = [];
      for (let i = 0; i < minLen; i++) {
        result.push(new PyTuple(iterables.map(it => it[i])));
      }
      return new PyList(result);
    }),

    map: new PyBuiltin('map', (args, vm) => {
      if (args.length < 2) throw new Error('TypeError: map() requires at least two arguments');
      const fn = args[0];
      const items = toItems(args[1]);
      return new PyList(items.map(item => fn.__call__([item], [], vm)));
    }),

    filter: new PyBuiltin('filter', (args, vm) => {
      if (args.length !== 2) throw new Error('TypeError: filter() takes exactly 2 arguments');
      const fn = args[0];
      const items = toItems(args[1]);
      if (fn === NONE) {
        return new PyList(items.filter(item => item.__bool__()));
      }
      return new PyList(items.filter(item => fn.__call__([item], [], vm).__bool__()));
    }),

    sorted: new PyBuiltin('sorted', (args) => {
      if (args.length !== 1) throw new Error('TypeError: sorted() takes exactly one argument');
      const items = [...toItems(args[0])];
      items.sort((a, b) => {
        const av = numericVal(a), bv = numericVal(b);
        if (av !== null && bv !== null) return av - bv;
        if (a.type === 'str' && b.type === 'str') return a.value < b.value ? -1 : a.value > b.value ? 1 : 0;
        throw new Error(`TypeError: '<' not supported between instances of '${a.type}' and '${b.type}'`);
      });
      return new PyList(items);
    }),

    reversed: new PyBuiltin('reversed', (args) => {
      if (args.length !== 1) throw new Error('TypeError: reversed() takes exactly one argument');
      return new PyList([...toItems(args[0])].reverse());
    }),

    any: new PyBuiltin('any', (args) => {
      if (args.length !== 1) throw new Error('TypeError: any() takes exactly one argument');
      const items = toItems(args[0]);
      return new PyBool(items.some(item => item.__bool__()));
    }),

    all: new PyBuiltin('all', (args) => {
      if (args.length !== 1) throw new Error('TypeError: all() takes exactly one argument');
      const items = toItems(args[0]);
      return new PyBool(items.every(item => item.__bool__()));
    }),

    isinstance: new PyBuiltin('isinstance', (args) => {
      if (args.length !== 2) throw new Error('TypeError: isinstance() takes exactly 2 arguments');
      const obj = args[0];
      const cls = args[1];
      if (!(cls instanceof PyClass)) throw new Error("TypeError: isinstance() arg 2 must be a type");
      if (!(obj instanceof PyInstance)) return new PyBool(false);
      return new PyBool(obj.klass.mro.includes(cls));
    }),

    issubclass: new PyBuiltin('issubclass', (args) => {
      if (args.length !== 2) throw new Error('TypeError: issubclass() takes exactly 2 arguments');
      const sub = args[0];
      const sup = args[1];
      if (!(sub instanceof PyClass) || !(sup instanceof PyClass)) {
        throw new Error("TypeError: issubclass() args must be classes");
      }
      return new PyBool(sub.mro.includes(sup));
    }),

    round: new PyBuiltin('round', (args) => {
      if (args.length < 1 || args.length > 2) throw new Error('TypeError: round() takes 1 or 2 arguments');
      const obj = args[0];
      const v = numericVal(obj);
      if (v === null) throw new Error(`TypeError: type ${obj.type} doesn't define __round__`);
      if (args.length === 2) {
        const n = asRangeInt(args[1]);
        const factor = 10 ** n;
        return new PyFloat(Math.round(v * factor) / factor);
      }
      return new PyInt(Math.round(v));
    }),

    pow: new PyBuiltin('pow', (args) => {
      if (args.length < 2 || args.length > 3) throw new Error('TypeError: pow() takes 2 or 3 arguments');
      const base = numericVal(args[0]);
      const exp = numericVal(args[1]);
      if (base === null || exp === null) throw new Error("TypeError: unsupported operand type(s) for pow()");
      if (args.length === 3) {
        const mod = numericVal(args[2]);
        if (mod === null) throw new Error("TypeError: unsupported operand type(s) for pow()");
        return new PyInt(Number(BigInt(base) ** BigInt(exp) % BigInt(mod)));
      }
      const isFloat = args[0].type === 'float' || args[1].type === 'float';
      return isFloat ? new PyFloat(base ** exp) : new PyInt(base ** exp);
    }),

    hash: new PyBuiltin('hash', (args) => {
      if (args.length !== 1) throw new Error('TypeError: hash() takes exactly one argument');
      const obj = args[0];
      if (obj.type === 'int') return new PyInt(obj.value);
      if (obj.type === 'bool') return new PyInt(obj.value ? 1 : 0);
      if (obj.type === 'str') {
        let h = 0;
        for (let i = 0; i < obj.value.length; i++) {
          h = (h * 31 + obj.value.charCodeAt(i)) | 0;
        }
        return new PyInt(h);
      }
      if (obj.type === 'float') return new PyInt(Math.trunc(obj.value));
      if (obj === NONE) return new PyInt(0);
      if (obj.type === 'tuple') {
        let h = 0x345678;
        for (const item of obj.items) h = (h * 1000003 + item.value) | 0;
        return new PyInt(h);
      }
      throw new Error(`TypeError: unhashable type: '${obj.type}'`);
    }),

    id: new PyBuiltin('id', (args) => {
      if (args.length !== 1) throw new Error('TypeError: id() takes exactly one argument');
      if (!args[0]._id) args[0]._id = Math.floor(Math.random() * 2 ** 31);
      return new PyInt(args[0]._id);
    }),

    callable: new PyBuiltin('callable', (args) => {
      if (args.length !== 1) throw new Error('TypeError: callable() takes exactly one argument');
      return new PyBool(typeof args[0].__call__ === 'function');
    }),

    repr: new PyBuiltin('repr', (args) => {
      if (args.length !== 1) throw new Error('TypeError: repr() takes exactly one argument');
      return new PyString(args[0].__repr__());
    }),

    list: new PyBuiltin('list', (args) => {
      if (args.length === 0) return new PyList([]);
      if (args.length !== 1) throw new Error('TypeError: list() takes at most 1 argument');
      return new PyList([...toItems(args[0])]);
    }),

    tuple: new PyBuiltin('tuple', (args) => {
      if (args.length === 0) return new PyTuple([]);
      if (args.length !== 1) throw new Error('TypeError: tuple() takes at most 1 argument');
      return new PyTuple([...toItems(args[0])]);
    }),

    // Built-in exception classes
    ...makeExceptionClasses(),
  };
}

function makeExceptionClass(name, bases = []) {
  const initFn = new PyBuiltin(`${name}.__init__`, (args) => {
    const self = args[0];
    if (args.length > 1) {
      self.__setattr__('message', args[1]);
    } else {
      self.__setattr__('message', new PyString(''));
    }
    return NONE;
  });

  const strFn = new PyBuiltin(`${name}.__str__`, (args) => {
    const self = args[0];
    try {
      return self.__getattr__('message');
    } catch {
      return new PyString('');
    }
  });

  const reprFn = new PyBuiltin(`${name}.__repr__`, (args) => {
    const self = args[0];
    try {
      const msg = self.__getattr__('message');
      const msgStr = msg.__str__();
      return new PyString(msgStr ? `${name}('${msgStr}')` : `${name}()`);
    } catch {
      return new PyString(`${name}()`);
    }
  });

  const namespace = new Map();
  namespace.set('__init__', initFn);
  namespace.set('__str__', strFn);
  namespace.set('__repr__', reprFn);
  return new PyClass(name, bases, namespace);
}

function makeExceptionClasses() {
  const BaseException = makeExceptionClass('BaseException');
  const Exception = makeExceptionClass('Exception', [BaseException]);
  const ValueError = makeExceptionClass('ValueError', [Exception]);
  const TypeError_ = makeExceptionClass('TypeError', [Exception]);
  const KeyError = makeExceptionClass('KeyError', [Exception]);
  const IndexError = makeExceptionClass('IndexError', [Exception]);
  const RuntimeError = makeExceptionClass('RuntimeError', [Exception]);
  const ZeroDivisionError = makeExceptionClass('ZeroDivisionError', [Exception]);
  const AttributeError = makeExceptionClass('AttributeError', [Exception]);
  const NameError = makeExceptionClass('NameError', [Exception]);
  const StopIteration = makeExceptionClass('StopIteration', [Exception]);

  return {
    BaseException,
    Exception,
    ValueError,
    TypeError: TypeError_,
    KeyError,
    IndexError,
    RuntimeError,
    ZeroDivisionError,
    AttributeError,
    NameError,
    StopIteration,
  };
}
