export class Environment {
  constructor(parent = null, options = {}) {
    this.vars = new Map();
    this.parent = parent;
    this.kind = options.kind ?? (parent ? 'function' : 'module');
    this.localBindings = new Set(options.localBindings ?? []);
    this.globalNames = new Set(options.globalNames ?? []);
    this.nonlocalNames = new Set(options.nonlocalNames ?? []);
    this.currentFunction = options.currentFunction ?? null;
  }

  get(name) {
    if (this.globalNames.has(name)) {
      return this.globalEnv().get(name);
    }

    if (this.nonlocalNames.has(name)) {
      const target = this.findEnclosingFunctionBinding(name);
      if (!target) {
        throw new Error(`SyntaxError: no binding for nonlocal '${name}' found`);
      }
      return target.getLocal(name);
    }

    if (this.localBindings.has(name)) {
      return this.getLocal(name);
    }

    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    throw new Error(`NameError: name '${name}' is not defined`);
  }

  set(name, value) {
    if (this.globalNames.has(name)) {
      this.globalEnv().set(name, value);
      return;
    }

    if (this.nonlocalNames.has(name)) {
      const target = this.findEnclosingFunctionBinding(name);
      if (!target) {
        throw new Error(`SyntaxError: no binding for nonlocal '${name}' found`);
      }
      target.setLocal(name, value);
      return;
    }

    this.setLocal(name, value);
  }

  getLocal(name) {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.localBindings.has(name)) {
      throw new Error(`UnboundLocalError: local variable '${name}' referenced before assignment`);
    }
    throw new Error(`NameError: name '${name}' is not defined`);
  }

  setLocal(name, value) {
    if (this.kind === 'function') {
      this.localBindings.add(name);
    }
    this.vars.set(name, value);
  }

  hasLocalBinding(name) {
    return this.localBindings.has(name) || this.vars.has(name);
  }

  globalEnv() {
    let env = this;
    while (env.parent) env = env.parent;
    return env;
  }

  findEnclosingFunctionBinding(name) {
    let env = this.parent;
    while (env) {
      if (env.kind === 'function' && env.hasLocalBinding(name)) {
        return env;
      }
      env = env.parent;
    }
    return null;
  }

  child(options = {}) {
    return new Environment(this, options);
  }
}
