export class Environment {
  constructor(parent = null) {
    this.vars = new Map();
    this.parent = parent;
  }

  get(name) {
    if (this.vars.has(name)) return this.vars.get(name);
    if (this.parent) return this.parent.get(name);
    throw new Error(`NameError: name '${name}' is not defined`);
  }

  set(name, value) {
    this.vars.set(name, value);
  }

  child() {
    return new Environment(this);
  }
}
