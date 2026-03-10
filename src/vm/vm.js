import { Op } from '../compiler/opcodes.js';
import { PyInt } from './objects/py-int.js';
import { PyFloat } from './objects/py-float.js';
import { PyString } from './objects/py-string.js';
import { PyBool } from './objects/py-bool.js';
import { PyList } from './objects/py-list.js';
import { PyDict } from './objects/py-dict.js';
import { PyTuple } from './objects/py-tuple.js';
import { NONE } from './objects/py-none.js';
import { PyFunction } from './objects/py-function.js';
import { PyClass, PyInstance } from './objects/py-class.js';
import { coerceArithmetic, wrapNumber } from './objects/coerce.js';
import { isTruthy } from './objects/truthy.js';
import { Environment } from '../runtime/environment.js';
import { addTracebackFrame, pythonError, JPythonError, normalizeRuntimeError } from '../runtime/errors.js';

function contains(container, value) {
  if (typeof container.__contains__ === 'function') {
    return container.__contains__(value);
  }
  throw pythonError('TypeError', `argument of type '${container.type}' is not iterable`);
}

function resolveCurrentExceptionType(env, err) {
  if (!(err instanceof JPythonError)) return NONE;
  try {
    return env.get(err.typeName);
  } catch {
    return NONE;
  }
}

function resolveCurrentExceptionValue(err, typeObj, vm) {
  if (!(err instanceof JPythonError)) {
    return new PyString(String(err?.message || err));
  }

  if (err._pyInstance) {
    return err._pyInstance;
  }

  if (typeObj instanceof PyClass) {
    try {
      const args = err.detail ? [new PyString(err.detail)] : [];
      return typeObj.__call__(args, [], vm);
    } catch {
      // Fall back to a plain string below.
    }
  }

  return new PyString(err.detail || '');
}

// Dispatch table: opcode → handler(registers, args, constants, names, env, vm, pc) → pc
// Handlers return undefined to continue normally, or a number to set pc, or a special sentinel.
const RETURN_SENTINEL = Symbol('RETURN');
const HALT_SENTINEL = Symbol('HALT');

function makeDispatch() {
  const table = new Array(256).fill(null);

  table[Op.LOAD_CONST] = (regs, args, constants) => {
    regs[args[0]] = constants[args[1]];
  };

  table[Op.LOAD_VAR] = (regs, args, constants, names, env) => {
    regs[args[0]] = env.get(names[args[1]]);
  };

  table[Op.STORE_VAR] = (regs, args, constants, names, env) => {
    env.set(names[args[0]], regs[args[1]]);
  };

  table[Op.ADD] = (regs, args) => {
    const left = regs[args[1]];
    const right = regs[args[2]];
    if (typeof left.__add__ === 'function' && left instanceof PyInstance) {
      regs[args[0]] = left.__add__(right);
    } else if (left.type === 'str' && right.type === 'str') {
      regs[args[0]] = new PyString(left.value + right.value);
    } else if (left.type === 'list' && right.type === 'list') {
      regs[args[0]] = new PyList([...left.items, ...right.items]);
    } else if (left.type === 'tuple' && right.type === 'tuple') {
      regs[args[0]] = new PyTuple([...left.items, ...right.items]);
    } else {
      const { l, r, isFloat } = coerceArithmetic(left, right);
      regs[args[0]] = wrapNumber(l + r, isFloat);
    }
  };

  table[Op.SUB] = (regs, args) => {
    const { l, r, isFloat } = coerceArithmetic(regs[args[1]], regs[args[2]]);
    regs[args[0]] = wrapNumber(l - r, isFloat);
  };

  table[Op.MUL] = (regs, args) => {
    const left = regs[args[1]];
    const right = regs[args[2]];
    if (left.type === 'str' && right.type === 'int') {
      regs[args[0]] = new PyString(right.value <= 0 ? '' : left.value.repeat(right.value));
    } else if (left.type === 'int' && right.type === 'str') {
      regs[args[0]] = new PyString(left.value <= 0 ? '' : right.value.repeat(left.value));
    } else if (left.type === 'list' && right.type === 'int') {
      regs[args[0]] = new PyList(repeatItems(left.items, right.value));
    } else if (left.type === 'int' && right.type === 'list') {
      regs[args[0]] = new PyList(repeatItems(right.items, left.value));
    } else if (left.type === 'tuple' && right.type === 'int') {
      regs[args[0]] = new PyTuple(repeatItems(left.items, right.value));
    } else if (left.type === 'int' && right.type === 'tuple') {
      regs[args[0]] = new PyTuple(repeatItems(right.items, left.value));
    } else {
      const { l, r, isFloat } = coerceArithmetic(left, right);
      regs[args[0]] = wrapNumber(l * r, isFloat);
    }
  };

  table[Op.DIV] = (regs, args) => {
    const lv = regs[args[1]].value;
    const rv = regs[args[2]].value;
    if (rv === 0) throw new Error('ZeroDivisionError: division by zero');
    regs[args[0]] = new PyFloat(lv / rv);
  };

  table[Op.MOD] = (regs, args) => {
    const { l, r, isFloat } = coerceArithmetic(regs[args[1]], regs[args[2]]);
    if (r === 0) throw new Error('ZeroDivisionError: modulo by zero');
    regs[args[0]] = wrapNumber(((l % r) + r) % r, isFloat);
  };

  table[Op.FLOORDIV] = (regs, args) => {
    const { l, r, isFloat } = coerceArithmetic(regs[args[1]], regs[args[2]]);
    if (r === 0) throw new Error('ZeroDivisionError: integer division or modulo by zero');
    regs[args[0]] = wrapNumber(Math.floor(l / r), isFloat);
  };

  table[Op.POWER] = (regs, args) => {
    const { l, r, isFloat } = coerceArithmetic(regs[args[1]], regs[args[2]]);
    regs[args[0]] = wrapNumber(l ** r, isFloat);
  };

  table[Op.NEG] = (regs, args) => {
    const val = regs[args[1]];
    regs[args[0]] = val.type === 'float' ? new PyFloat(-val.value) : new PyInt(-val.value);
  };

  table[Op.CMP_EQ] = (regs, args) => {
    regs[args[0]] = new PyBool(regs[args[1]].__eq__(regs[args[2]]));
  };

  table[Op.CMP_NE] = (regs, args) => {
    regs[args[0]] = new PyBool(!regs[args[1]].__eq__(regs[args[2]]));
  };

  table[Op.CMP_LT] = (regs, args) => {
    const { l, r } = coerceArithmetic(regs[args[1]], regs[args[2]]);
    regs[args[0]] = new PyBool(l < r);
  };

  table[Op.CMP_GT] = (regs, args) => {
    const { l, r } = coerceArithmetic(regs[args[1]], regs[args[2]]);
    regs[args[0]] = new PyBool(l > r);
  };

  table[Op.CMP_LE] = (regs, args) => {
    const { l, r } = coerceArithmetic(regs[args[1]], regs[args[2]]);
    regs[args[0]] = new PyBool(l <= r);
  };

  table[Op.CMP_GE] = (regs, args) => {
    const { l, r } = coerceArithmetic(regs[args[1]], regs[args[2]]);
    regs[args[0]] = new PyBool(l >= r);
  };

  table[Op.CMP_IN] = (regs, args) => {
    regs[args[0]] = new PyBool(contains(regs[args[2]], regs[args[1]]));
  };

  table[Op.CMP_NOT_IN] = (regs, args) => {
    regs[args[0]] = new PyBool(!contains(regs[args[2]], regs[args[1]]));
  };

  table[Op.AND] = (regs, args) => {
    const left = regs[args[1]];
    regs[args[0]] = isTruthy(left) ? regs[args[2]] : left;
  };

  table[Op.OR] = (regs, args) => {
    const left = regs[args[1]];
    regs[args[0]] = isTruthy(left) ? left : regs[args[2]];
  };

  table[Op.NOT] = (regs, args) => {
    regs[args[0]] = new PyBool(!isTruthy(regs[args[1]]));
  };

  // JMP and JMP_IF_FALSE return new pc values
  table[Op.JMP] = (regs, args) => args[0];

  table[Op.JMP_IF_FALSE] = (regs, args) => {
    if (!isTruthy(regs[args[0]])) return args[1];
  };

  table[Op.PRINT] = (regs, args, constants, names, env, vm) => {
    const parts = [];
    for (const reg of (args[0] || [])) {
      parts.push(regs[reg].__str__());
    }
    vm.output.write(parts.join(' ') + '\n');
  };

  table[Op.CALL] = (regs, args, constants, names, env, vm) => {
    const callee = regs[args[1]];
    const callArgs = (args[2] || []).map(reg => regs[reg]);
    const kwNameIdxs = args[3] || [];
    const kwRegs = args[4] || [];
    const kwargs = kwNameIdxs.map((idx, i) => ({ name: names[idx], value: regs[kwRegs[i]] }));
    if (callee && typeof callee.__call__ === 'function') {
      regs[args[0]] = callee.__call__(callArgs, kwargs, vm, env);
    } else {
      throw new Error(`TypeError: '${callee?.type}' object is not callable`);
    }
  };

  table[Op.DEF_FUNC] = (regs, args, constants, names, env) => {
    const codeObject = constants[args[1]];
    const defaults = (args[2] || []).map(reg => regs[reg]);
    env.set(
      names[args[0]],
      new PyFunction(
        names[args[0]],
        codeObject.params,
        codeObject.requiredParamCount,
        defaults,
        codeObject.bytecode,
        env,
        codeObject.scopeInfo
      )
    );
  };

  table[Op.BUILD_FUNCTION] = (regs, args, constants, names, env) => {
    const codeObject = constants[args[1]];
    const defaults = (args[2] || []).map(reg => regs[reg]);
    regs[args[0]] = new PyFunction(
      codeObject.name,
      codeObject.params,
      codeObject.requiredParamCount,
      defaults,
      codeObject.bytecode,
      env,
      codeObject.scopeInfo
    );
  };

  table[Op.RETURN] = (regs, args) => {
    regs._returnValue = regs[args[0]] ?? NONE;
    return RETURN_SENTINEL;
  };

  table[Op.INDEX_GET] = (regs, args) => {
    const obj = regs[args[1]];
    const idx = regs[args[2]];
    if (typeof obj.__getitem__ === 'function') {
      regs[args[0]] = obj.__getitem__(idx);
    } else {
      throw new Error(`TypeError: '${obj.type}' object is not subscriptable`);
    }
  };

  table[Op.INDEX_SET] = (regs, args) => {
    const obj = regs[args[0]];
    const idx = regs[args[1]];
    const val = regs[args[2]];
    if (typeof obj.__setitem__ === 'function') {
      obj.__setitem__(idx, val);
    } else {
      throw new Error(`TypeError: '${obj.type}' object does not support item assignment`);
    }
  };

  table[Op.BUILD_LIST] = (regs, args) => {
    regs[args[0]] = new PyList();
  };

  table[Op.BUILD_DICT] = (regs, args) => {
    regs[args[0]] = new PyDict();
  };

  table[Op.BUILD_TUPLE] = (regs, args) => {
    regs[args[0]] = new PyTuple((args[1] || []).map(reg => regs[reg]));
  };

  table[Op.LIST_APPEND] = (regs, args) => {
    const list = regs[args[0]];
    if (!(list instanceof PyList)) {
      throw new Error(`TypeError: '${list?.type}' object does not support append construction`);
    }
    list.items.push(regs[args[1]]);
  };

  table[Op.MOVE] = (regs, args) => {
    regs[args[0]] = regs[args[1]];
  };

  table[Op.SLICE] = (regs, args) => {
    const obj = regs[args[1]];
    const start = regs[args[2]];
    const stop = regs[args[3]];
    const step = regs[args[4]];
    if (typeof obj.__getslice__ === 'function') {
      regs[args[0]] = obj.__getslice__(start, stop, step);
    } else {
      throw new Error(`TypeError: '${obj.type}' object is not subscriptable`);
    }
  };

  table[Op.ATTR_GET] = (regs, args, constants, names) => {
    const obj = regs[args[1]];
    const name = names[args[2]];
    if (obj instanceof PyInstance) {
      regs[args[0]] = obj.__getattr__(name);
    } else if (obj instanceof PyClass) {
      const val = obj.resolve(name);
      if (val !== undefined) {
        regs[args[0]] = val;
      } else {
        throw new Error(`AttributeError: type object '${obj.name}' has no attribute '${name}'`);
      }
    } else if (obj && typeof obj.__getattr__ === 'function') {
      regs[args[0]] = obj.__getattr__(name);
    } else {
      throw new Error(`AttributeError: '${obj.type}' object has no attribute '${name}'`);
    }
  };

  table[Op.ATTR_SET] = (regs, args, constants, names) => {
    const obj = regs[args[0]];
    const name = names[args[1]];
    const val = regs[args[2]];
    if (obj instanceof PyInstance) {
      obj.__setattr__(name, val);
    } else {
      throw new Error(`AttributeError: '${obj.type}' object attribute '${name}' is read-only`);
    }
  };

  table[Op.BUILD_CLASS] = (regs, args, constants, names, env, vm) => {
    const className = regs[args[1]].__str__();
    const bodyCode = constants[args[2]];
    const baseRegs = args[3] || [];
    const bases = baseRegs.map(reg => regs[reg]);

    // Execute class body in a child environment to collect namespace
    const classEnv = env.child();
    vm.execute(bodyCode.bytecode, classEnv, className);

    // Collect namespace from classEnv
    const namespace = new Map(classEnv.vars);

    const klass = new PyClass(className, bases, namespace);
    classEnv.setLocal('__class__', klass);
    env.set(names[args[0]], klass);
  };

  table[Op.SETUP_TRY] = () => {
    // Handled specially in the execute loop
  };

  table[Op.POP_TRY] = () => {
    // Handled specially in the execute loop
  };

  table[Op.RAISE] = (regs, args, constants, names, env, vm) => {
    const mode = args[1]; // 0 = raise new, 1 = re-raise
    if (mode === 1) {
      // Re-raise current exception
      const current = env.vars.get('$current_exception');
      if (current) {
        throw current;
      }
      throw pythonError('RuntimeError', 'No active exception to re-raise');
    }
    // Raise new: args[0] is the value register
    const value = regs[args[0]];
    if (value instanceof PyInstance) {
      // Raising an instance of a class, e.g. raise ValueError("msg")
      const err = pythonError(value.klass.name, '');
      err._pyInstance = value;
      // Try to get message from the instance
      try {
        const msgAttr = value.__getattr__('message');
        err.detail = msgAttr.__str__();
      } catch {
        // Try args
        try {
          const argsAttr = value.__getattr__('args');
          err.detail = argsAttr.__str__();
        } catch {
          err.detail = value.__str__();
        }
      }
      err.refreshMessage();
      throw err;
    }
    if (value instanceof PyClass) {
      // raise ValueError — call the class with no args to create instance
      const instance = value.__call__([], [], vm);
      const err = pythonError(value.name, '');
      err._pyInstance = instance;
      throw err;
    }
    if (value instanceof PyString) {
      throw pythonError('Exception', value.value);
    }
    throw pythonError('TypeError', 'exceptions must derive from BaseException');
  };

  table[Op.MATCH_EXCEPT] = (regs, args, constants, names, env) => {
    const typeObj = regs[args[1]];
    const currentExc = env.vars.get('$current_exception');
    if (!currentExc) {
      regs[args[0]] = new PyBool(false);
      return;
    }
    if (!(currentExc instanceof JPythonError)) {
      regs[args[0]] = new PyBool(false);
      return;
    }
    // Match by class name
    if (typeObj instanceof PyClass) {
      regs[args[0]] = new PyBool(currentExc.typeName === typeObj.name);
    } else if (typeObj && typeObj.name) {
      regs[args[0]] = new PyBool(currentExc.typeName === typeObj.name);
    } else {
      regs[args[0]] = new PyBool(false);
    }
  };

  table[Op.HALT] = () => HALT_SENTINEL;

  return table;
}

function repeatItems(items, count) {
  if (count <= 0) return [];
  const result = [];
  for (let i = 0; i < count; i++) {
    for (const item of items) result.push(item);
  }
  return result;
}

const DISPATCH = makeDispatch();

export class VM {
  constructor(output) {
    this.registers = [];
    this.env = new Environment();
    this.output = output || { write(str) { process.stdout.write(str); } };
  }

  run(bytecode) {
    return this.execute(bytecode, this.env, '<module>');
  }

  execute(bytecode, env, frameName = '<module>') {
    const { instructions, constants, names } = bytecode;
    const registers = new Array(bytecode.registerCount ?? 0).fill(null);
    const exceptionStack = []; // stack of { handlerPC }
    let pc = 0;

    try {
      while (pc < instructions.length) {
        const { op, args } = instructions[pc];
        pc++;

        // Handle SETUP_TRY specially — push handler address
        if (op === Op.SETUP_TRY) {
          exceptionStack.push({ handlerPC: args[0] });
          continue;
        }

        // Handle POP_TRY specially — pop handler from stack
        if (op === Op.POP_TRY) {
          exceptionStack.pop();
          continue;
        }

        const handler = DISPATCH[op];
        if (!handler) {
          throw new Error(`Unknown opcode: 0x${op.toString(16)}`);
        }

        try {
          const result = handler(registers, args, constants, names, env, this);

          if (result === RETURN_SENTINEL) {
            this.registers = registers;
            return registers._returnValue;
          }
          if (result === HALT_SENTINEL) {
            this.registers = registers;
            return NONE;
          }
          if (typeof result === 'number') {
            pc = result;
          }
        } catch (innerErr) {
          // Normalize the error
          const pyErr = normalizeRuntimeError(innerErr);

          if (exceptionStack.length > 0) {
            const tryHandler = exceptionStack.pop();
            // Store raw exception for MATCH_EXCEPT type checking
            env.vars.set('$current_exception', pyErr);
            const exceptionType = resolveCurrentExceptionType(env, pyErr);
            env.vars.set('$current_exception_type', exceptionType);
            env.vars.set('$current_exception_value', resolveCurrentExceptionValue(pyErr, exceptionType, this));
            pc = tryHandler.handlerPC;
          } else {
            throw pyErr;
          }
        }
      }
    } catch (err) {
      throw addTracebackFrame(err, frameName);
    }

    this.registers = registers;
    return NONE;
  }
}
