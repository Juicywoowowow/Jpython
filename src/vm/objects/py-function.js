import { PyObject } from './py-object.js';

function formatArgCount(count) {
  return `${count} positional argument${count === 1 ? '' : 's'}`;
}

function formatNameList(names) {
  if (names.length === 1) return `'${names[0]}'`;
  if (names.length === 2) return `'${names[0]}' and '${names[1]}'`;
  return `${names.slice(0, -1).map(name => `'${name}'`).join(', ')}, and '${names[names.length - 1]}'`;
}

export class PyFunction extends PyObject {
  constructor(name, params, requiredParamCount, defaults, bytecode, closureEnv, scopeInfo) {
    super('function');
    this.name = name;
    this.params = params;
    this.requiredParamCount = requiredParamCount;
    this.defaults = defaults;
    this.bytecode = bytecode;
    this.closureEnv = closureEnv;
    this.scopeInfo = scopeInfo;
  }

  __call__(args, kwargs, vm) {
    if (args.length > this.params.length) {
      const expected = this.requiredParamCount === this.params.length
        ? formatArgCount(this.params.length)
        : `from ${this.requiredParamCount} to ${this.params.length} positional arguments`;
      throw new Error(
        `TypeError: ${this.name}() takes ${expected} but ${args.length} ${args.length === 1 ? 'was' : 'were'} given`
      );
    }

    const localEnv = this.closureEnv.child({
      kind: 'function',
      localBindings: this.scopeInfo.localBindings,
      globalNames: this.scopeInfo.globalNames,
      nonlocalNames: this.scopeInfo.nonlocalNames,
      currentFunction: this,
    });
    const bound = new Array(this.params.length).fill(false);

    for (let i = 0; i < this.params.length; i++) {
      if (i < args.length) {
        localEnv.set(this.params[i], args[i]);
        bound[i] = true;
      }
    }

    for (const kw of (kwargs || [])) {
      const index = this.params.indexOf(kw.name);
      if (index === -1) {
        throw new Error(`TypeError: ${this.name}() got an unexpected keyword argument '${kw.name}'`);
      }
      if (bound[index]) {
        throw new Error(`TypeError: ${this.name}() got multiple values for argument '${kw.name}'`);
      }
      localEnv.set(this.params[index], kw.value);
      bound[index] = true;
    }

    for (let i = this.requiredParamCount; i < this.params.length; i++) {
      if (!bound[i]) {
        localEnv.set(this.params[i], this.defaults[i - this.requiredParamCount]);
        bound[i] = true;
      }
    }

    const missing = [];
    for (let i = 0; i < this.requiredParamCount; i++) {
      if (!bound[i]) missing.push(this.params[i]);
    }

    if (missing.length > 0) {
      throw new Error(
        `TypeError: ${this.name}() missing ${missing.length} required positional argument${missing.length === 1 ? '' : 's'}: ${formatNameList(missing)}`
      );
    }

    return vm.execute(this.bytecode, localEnv, this.name);
  }

  __repr__() {
    return `<function ${this.name}>`;
  }
}

export function createCodeObject(name, params, requiredParamCount, bytecode) {
  return {
    kind: 'code',
    name,
    params,
    requiredParamCount,
    bytecode,
    scopeInfo: {
      localBindings: [],
      globalNames: [],
      nonlocalNames: [],
    },
    __repr__() {
      return `<code ${name}>`;
    },
  };
}