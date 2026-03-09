import { Op } from './opcodes.js';
import { instr } from './instruction.js';
import { RegisterAllocator } from './register-allocator.js';
import { PyInt } from '../vm/objects/py-int.js';
import { PyFloat } from '../vm/objects/py-float.js';
import { PyString } from '../vm/objects/py-string.js';
import { PyBool } from '../vm/objects/py-bool.js';
import { NONE } from '../vm/objects/py-none.js';
import * as AST from '../parser/ast-nodes.js';
import { createCodeObject } from '../vm/objects/py-function.js';

const BINARY_OPS = {
  '+': Op.ADD,
  '-': Op.SUB,
  '*': Op.MUL,
  '/': Op.DIV,
  '%': Op.MOD,
  '==': Op.CMP_EQ,
  '!=': Op.CMP_NE,
  '<': Op.CMP_LT,
  '>': Op.CMP_GT,
  '<=': Op.CMP_LE,
  '>=': Op.CMP_GE,
  'in': Op.CMP_IN,
  'not in': Op.CMP_NOT_IN,
};

export class Compiler {
  constructor(options = {}) {
    this.instructions = [];
    this.constants = [];
    this.names = [];
    this.regs = new RegisterAllocator();
    this.loopStack = [];
    this.internalNameCounter = 0;
    this.outerFunctionScopes = options.outerFunctionScopes ?? [];
    this.currentScopeInfo = options.currentScopeInfo ?? null;
  }

  addConstant(value) {
    this.constants.push(value);
    return this.constants.length - 1;
  }

  addName(name) {
    let idx = this.names.indexOf(name);
    if (idx === -1) {
      this.names.push(name);
      idx = this.names.length - 1;
    }
    return idx;
  }

  emit(op, ...args) {
    this.instructions.push(instr(op, ...args));
    return this.instructions.length - 1;
  }

  patch(addr, op, ...args) {
    this.instructions[addr] = instr(op, ...args);
  }

  emitNoneConst() {
    const reg = this.regs.alloc();
    const idx = this.addConstant(NONE);
    this.emit(Op.LOAD_CONST, reg, idx);
    return reg;
  }

  freshInternalName(prefix) {
    const id = this.internalNameCounter++;
    return `$${prefix}_${id}`;
  }

  analyzeFunctionScope(node) {
    const params = new Set(node.params);
    const localBindings = new Set(node.params);
    const globalNames = new Set();
    const nonlocalNames = new Set();

    const declareGlobal = (name) => {
      if (params.has(name)) {
        throw new SyntaxError(`SyntaxError: name '${name}' is parameter and global`);
      }
      if (nonlocalNames.has(name)) {
        throw new SyntaxError(`SyntaxError: name '${name}' is nonlocal and global`);
      }
      globalNames.add(name);
      localBindings.delete(name);
    };

    const declareNonlocal = (name) => {
      if (params.has(name)) {
        throw new SyntaxError(`SyntaxError: name '${name}' is parameter and nonlocal`);
      }
      if (globalNames.has(name)) {
        throw new SyntaxError(`SyntaxError: name '${name}' is nonlocal and global`);
      }
      if (!this.outerFunctionScopes.some(scope => scope.has(name))) {
        throw new SyntaxError(`SyntaxError: no binding for nonlocal '${name}' found`);
      }
      nonlocalNames.add(name);
      localBindings.delete(name);
    };

    const registerBinding = (name) => {
      if (globalNames.has(name) || nonlocalNames.has(name)) return;
      localBindings.add(name);
    };

    const visitStatements = (statements) => {
      for (const stmt of statements) visitStatement(stmt);
    };

    const visitStatement = (stmt) => {
      switch (stmt.type) {
        case 'AssignStmt':
          registerBinding(stmt.name);
          break;
        case 'ForStmt':
          registerBinding(stmt.target);
          visitStatements(stmt.body);
          break;
        case 'FunctionDefStmt':
          registerBinding(stmt.name);
          break;
        case 'ClassDefStmt':
          registerBinding(stmt.name);
          break;
        case 'IfStmt':
          visitStatements(stmt.body);
          for (const elif of stmt.elifs) visitStatements(elif.body);
          if (stmt.elseBody) visitStatements(stmt.elseBody);
          break;
        case 'WhileStmt':
          visitStatements(stmt.body);
          break;
        case 'GlobalStmt':
          for (const name of stmt.names) declareGlobal(name);
          break;
        case 'NonlocalStmt':
          for (const name of stmt.names) declareNonlocal(name);
          break;
        default:
          break;
      }
    };

    visitStatements(node.body);

    return { localBindings, globalNames, nonlocalNames };
  }

  compileAndExpr(node, preferredReg = null) {
    const left = this.compileExpr(node.left, preferredReg);
    const skipRight = this.emit(Op.JMP_IF_FALSE, left, 0);
    const right = this.compileExpr(node.right, left);
    if (right !== left) {
      this.emit(Op.MOVE, left, right);
      this.regs.release(right);
    }
    this.patch(skipRight, Op.JMP_IF_FALSE, left, this.instructions.length);
    return left;
  }

  compileOrExpr(node, preferredReg = null) {
    const left = this.compileExpr(node.left, preferredReg);
    const evalRight = this.emit(Op.JMP_IF_FALSE, left, 0);
    const skipRight = this.emit(Op.JMP, 0);
    this.patch(evalRight, Op.JMP_IF_FALSE, left, this.instructions.length);
    const right = this.compileExpr(node.right, left);
    if (right !== left) {
      this.emit(Op.MOVE, left, right);
      this.regs.release(right);
    }
    this.patch(skipRight, Op.JMP, this.instructions.length);
    return left;
  }

  canPlanExpr(node) {
    switch (node.type) {
      case 'NumberLiteral':
      case 'StringLiteral':
      case 'BoolLiteral':
      case 'NoneLiteral':
      case 'Identifier':
        return true;
      case 'UnaryExpr':
        return this.canPlanExpr(node.operand);
      case 'BinaryExpr':
        return node.op !== 'and' && node.op !== 'or' && this.canPlanExpr(node.left) && this.canPlanExpr(node.right);
      case 'ListExpr':
      case 'TupleExpr':
        return node.elements.every(element => this.canPlanExpr(element));
      case 'DictExpr':
        return node.entries.every(entry => this.canPlanExpr(entry.key) && this.canPlanExpr(entry.value));
      case 'IndexExpr':
        return this.canPlanExpr(node.object) && this.canPlanExpr(node.index);
      case 'SliceExpr':
        return this.canPlanExpr(node.object)
          && (!node.start || this.canPlanExpr(node.start))
          && (!node.stop || this.canPlanExpr(node.stop))
          && (!node.step || this.canPlanExpr(node.step));
      case 'DotExpr':
        return this.canPlanExpr(node.object);
      case 'CallExpr':
        return this.canPlanExpr(node.callee)
          && node.args.every(arg => this.canPlanExpr(arg))
          && node.kwargs.every(arg => this.canPlanExpr(arg.value));
      default:
        return false;
    }
  }

  planNoneConst(state) {
    const dst = this.createPlanTemp(state);
    const idx = this.addConstant(NONE);
    state.ops.push({ kind: 'LOAD_CONST', dst, constIdx: idx });
    return dst;
  }

  createPlanTemp(state) {
    const temp = state.nextTemp;
    state.nextTemp += 1;
    return temp;
  }

  planExprNode(node, state) {
    switch (node.type) {
      case 'NumberLiteral': {
        const dst = this.createPlanTemp(state);
        const obj = Number.isInteger(node.value) ? new PyInt(node.value) : new PyFloat(node.value);
        const idx = this.addConstant(obj);
        state.ops.push({ kind: 'LOAD_CONST', dst, constIdx: idx });
        return dst;
      }

      case 'StringLiteral': {
        const dst = this.createPlanTemp(state);
        const idx = this.addConstant(new PyString(node.value));
        state.ops.push({ kind: 'LOAD_CONST', dst, constIdx: idx });
        return dst;
      }

      case 'BoolLiteral': {
        const dst = this.createPlanTemp(state);
        const idx = this.addConstant(new PyBool(node.value));
        state.ops.push({ kind: 'LOAD_CONST', dst, constIdx: idx });
        return dst;
      }

      case 'NoneLiteral': {
        const dst = this.createPlanTemp(state);
        const idx = this.addConstant(NONE);
        state.ops.push({ kind: 'LOAD_CONST', dst, constIdx: idx });
        return dst;
      }

      case 'Identifier': {
        const dst = this.createPlanTemp(state);
        const nameIdx = this.addName(node.name);
        state.ops.push({ kind: 'LOAD_VAR', dst, nameIdx });
        return dst;
      }

      case 'UnaryExpr': {
        const operand = this.planExprNode(node.operand, state);
        const dst = this.createPlanTemp(state);
        const kind = node.op === '-' ? 'NEG' : 'NOT';
        state.ops.push({ kind, dst, operand });
        return dst;
      }

      case 'BinaryExpr': {
        const opcode = BINARY_OPS[node.op];
        if (opcode === undefined) {
          throw new Error(`Unknown binary operator: ${node.op}`);
        }
        const left = this.planExprNode(node.left, state);
        const right = this.planExprNode(node.right, state);
        const dst = this.createPlanTemp(state);
        state.ops.push({ kind: 'BINARY', opcode, dst, left, right });
        return dst;
      }

      case 'ListExpr': {
        const dst = this.createPlanTemp(state);
        state.ops.push({ kind: 'BUILD_LIST', dst });
        for (const element of node.elements) {
          const value = this.planExprNode(element, state);
          state.ops.push({ kind: 'LIST_APPEND', list: dst, value });
        }
        return dst;
      }

      case 'TupleExpr': {
        const elements = node.elements.map(element => this.planExprNode(element, state));
        const dst = this.createPlanTemp(state);
        state.ops.push({ kind: 'BUILD_TUPLE', dst, elements });
        return dst;
      }

      case 'DictExpr': {
        const dst = this.createPlanTemp(state);
        state.ops.push({ kind: 'BUILD_DICT', dst });
        for (const entry of node.entries) {
          const key = this.planExprNode(entry.key, state);
          const value = this.planExprNode(entry.value, state);
          state.ops.push({ kind: 'INDEX_SET', object: dst, index: key, value });
        }
        return dst;
      }

      case 'IndexExpr': {
        const object = this.planExprNode(node.object, state);
        const index = this.planExprNode(node.index, state);
        const dst = this.createPlanTemp(state);
        state.ops.push({ kind: 'INDEX_GET', dst, object, index });
        return dst;
      }

      case 'SliceExpr': {
        const object = this.planExprNode(node.object, state);
        const start = node.start ? this.planExprNode(node.start, state) : this.planNoneConst(state);
        const stop = node.stop ? this.planExprNode(node.stop, state) : this.planNoneConst(state);
        const step = node.step ? this.planExprNode(node.step, state) : this.planNoneConst(state);
        const dst = this.createPlanTemp(state);
        state.ops.push({ kind: 'SLICE', dst, object, start, stop, step });
        return dst;
      }

      case 'DotExpr': {
        const object = this.planExprNode(node.object, state);
        const dst = this.createPlanTemp(state);
        const nameIdx = this.addName(node.attr);
        state.ops.push({ kind: 'ATTR_GET', dst, object, nameIdx });
        return dst;
      }

      case 'CallExpr': {
        const callee = this.planExprNode(node.callee, state);
        const args = node.args.map(arg => this.planExprNode(arg, state));
        const kwNameIdxs = node.kwargs.map(arg => this.addName(arg.name));
        const kwValues = node.kwargs.map(arg => this.planExprNode(arg.value, state));
        const dst = this.createPlanTemp(state);
        state.ops.push({ kind: 'CALL', dst, callee, args, kwNameIdxs, kwValues });
        return dst;
      }

      default:
        throw new Error(`Cannot plan expression node: ${node.type}`);
    }
  }

  buildExprPlan(node) {
    const state = { ops: [], nextTemp: 0 };
    const resultTemp = this.planExprNode(node, state);
    return { ops: state.ops, resultTemp };
  }

  getPlanOpUsesDefs(op) {
    switch (op.kind) {
      case 'LOAD_CONST':
      case 'LOAD_VAR':
      case 'BUILD_LIST':
      case 'BUILD_DICT':
        return { uses: [], defs: [op.dst] };
      case 'BUILD_TUPLE':
        return { uses: op.elements, defs: [op.dst] };
      case 'NEG':
      case 'NOT':
        return { uses: [op.operand], defs: [op.dst] };
      case 'BINARY':
        return { uses: [op.left, op.right], defs: [op.dst] };
      case 'LIST_APPEND':
        return { uses: [op.list, op.value], defs: [] };
      case 'INDEX_GET':
        return { uses: [op.object, op.index], defs: [op.dst] };
      case 'INDEX_SET':
        return { uses: [op.object, op.index, op.value], defs: [] };
      case 'SLICE':
        return { uses: [op.object, op.start, op.stop, op.step], defs: [op.dst] };
      case 'ATTR_GET':
        return { uses: [op.object], defs: [op.dst] };
      case 'CALL':
        return { uses: [op.callee, ...op.args, ...op.kwValues], defs: [op.dst] };
      default:
        throw new Error(`Unknown planned op: ${op.kind}`);
    }
  }

  computePlanIntervals(plan) {
    const intervals = new Map();

    const ensureInterval = (temp) => {
      if (!intervals.has(temp)) {
        intervals.set(temp, { temp, start: null, end: null });
      }
      return intervals.get(temp);
    };

    plan.ops.forEach((op, index) => {
      const { uses, defs } = this.getPlanOpUsesDefs(op);
      const usePos = index * 2;
      const defPos = usePos + 1;

      for (const temp of uses) {
        const interval = ensureInterval(temp);
        interval.end = interval.end === null ? usePos : Math.max(interval.end, usePos);
      }

      for (const temp of defs) {
        const interval = ensureInterval(temp);
        interval.start = defPos;
        interval.end = interval.end === null ? defPos : Math.max(interval.end, defPos);
      }
    });

    const rootInterval = ensureInterval(plan.resultTemp);
    const rootEnd = plan.ops.length * 2;
    rootInterval.end = rootInterval.end === null ? rootEnd : Math.max(rootInterval.end, rootEnd);

    return [...intervals.values()].sort((a, b) => a.start - b.start || a.end - b.end || a.temp - b.temp);
  }

  allocatePlanRegisters(plan, preferredReg = null) {
    const intervals = this.computePlanIntervals(plan);
    const active = [];
    const tempRegs = new Map();

    const expireOld = (start) => {
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].end < start) {
          this.regs.release(active[i].reg);
          active.splice(i, 1);
        }
      }
    };

    for (const interval of intervals) {
      expireOld(interval.start);
      const reg = this.regs.alloc(interval.temp === plan.resultTemp ? preferredReg : null);
      tempRegs.set(interval.temp, reg);
      active.push({ temp: interval.temp, end: interval.end, reg });
    }

    for (const interval of active) {
      if (interval.temp !== plan.resultTemp) {
        this.regs.release(interval.reg);
      }
    }

    return tempRegs;
  }

  emitPlannedExpr(plan, tempRegs) {
    const regOf = (temp) => tempRegs.get(temp);

    for (const op of plan.ops) {
      switch (op.kind) {
        case 'LOAD_CONST':
          this.emit(Op.LOAD_CONST, regOf(op.dst), op.constIdx);
          break;
        case 'LOAD_VAR':
          this.emit(Op.LOAD_VAR, regOf(op.dst), op.nameIdx);
          break;
        case 'NEG':
          this.emit(Op.NEG, regOf(op.dst), regOf(op.operand));
          break;
        case 'NOT':
          this.emit(Op.NOT, regOf(op.dst), regOf(op.operand));
          break;
        case 'BINARY':
          this.emit(op.opcode, regOf(op.dst), regOf(op.left), regOf(op.right));
          break;
        case 'BUILD_LIST':
          this.emit(Op.BUILD_LIST, regOf(op.dst));
          break;
        case 'LIST_APPEND':
          this.emit(Op.LIST_APPEND, regOf(op.list), regOf(op.value));
          break;
        case 'BUILD_DICT':
          this.emit(Op.BUILD_DICT, regOf(op.dst));
          break;
        case 'BUILD_TUPLE':
          this.emit(Op.BUILD_TUPLE, regOf(op.dst), op.elements.map(element => regOf(element)));
          break;
        case 'INDEX_GET':
          this.emit(Op.INDEX_GET, regOf(op.dst), regOf(op.object), regOf(op.index));
          break;
        case 'INDEX_SET':
          this.emit(Op.INDEX_SET, regOf(op.object), regOf(op.index), regOf(op.value));
          break;
        case 'SLICE':
          this.emit(Op.SLICE, regOf(op.dst), regOf(op.object), regOf(op.start), regOf(op.stop), regOf(op.step));
          break;
        case 'ATTR_GET':
          this.emit(Op.ATTR_GET, regOf(op.dst), regOf(op.object), op.nameIdx);
          break;
        case 'CALL':
          this.emit(
            Op.CALL,
            regOf(op.dst),
            regOf(op.callee),
            op.args.map(arg => regOf(arg)),
            op.kwNameIdxs,
            op.kwValues.map(arg => regOf(arg))
          );
          break;
        default:
          throw new Error(`Unknown planned op: ${op.kind}`);
      }
    }

    return regOf(plan.resultTemp);
  }

  compilePlannedExpr(node, preferredReg = null) {
    const plan = this.buildExprPlan(node);
    const tempRegs = this.allocatePlanRegisters(plan, preferredReg);
    return this.emitPlannedExpr(plan, tempRegs);
  }

  compileExpr(node, preferredReg = null) {
    if (this.canPlanExpr(node)) {
      return this.compilePlannedExpr(node, preferredReg);
    }

    switch (node.type) {
      case 'NumberLiteral': {
        const reg = this.regs.alloc(preferredReg);
        const obj = Number.isInteger(node.value) ? new PyInt(node.value) : new PyFloat(node.value);
        const idx = this.addConstant(obj);
        this.emit(Op.LOAD_CONST, reg, idx);
        return reg;
      }

      case 'StringLiteral': {
        const reg = this.regs.alloc(preferredReg);
        const idx = this.addConstant(new PyString(node.value));
        this.emit(Op.LOAD_CONST, reg, idx);
        return reg;
      }

      case 'BoolLiteral': {
        const reg = this.regs.alloc(preferredReg);
        const idx = this.addConstant(new PyBool(node.value));
        this.emit(Op.LOAD_CONST, reg, idx);
        return reg;
      }

      case 'NoneLiteral': {
        const reg = this.regs.alloc(preferredReg);
        const idx = this.addConstant(NONE);
        this.emit(Op.LOAD_CONST, reg, idx);
        return reg;
      }

      case 'Identifier': {
        const reg = this.regs.alloc(preferredReg);
        const nameIdx = this.addName(node.name);
        this.emit(Op.LOAD_VAR, reg, nameIdx);
        return reg;
      }

      case 'UnaryExpr': {
        const operand = this.compileExpr(node.operand, preferredReg);
        if (node.op === '-') {
          this.emit(Op.NEG, operand, operand);
        } else if (node.op === 'not') {
          this.emit(Op.NOT, operand, operand);
        }
        return operand;
      }

      case 'BinaryExpr': {
        if (node.op === 'and') {
          return this.compileAndExpr(node, preferredReg);
        }

        if (node.op === 'or') {
          return this.compileOrExpr(node, preferredReg);
        }

        const opcode = BINARY_OPS[node.op];
        if (opcode === undefined) {
          throw new Error(`Unknown binary operator: ${node.op}`);
        }
        const left = this.compileExpr(node.left, preferredReg);
        const right = this.compileExpr(node.right);
        this.emit(opcode, left, left, right);
        this.regs.release(right);
        return left;
      }

      case 'ListExpr': {
        const dst = this.regs.alloc(preferredReg);
        this.emit(Op.BUILD_LIST, dst);
        for (const element of node.elements) {
          const elementReg = this.compileExpr(element);
          this.emit(Op.LIST_APPEND, dst, elementReg);
          this.regs.release(elementReg);
        }
        return dst;
      }

      case 'TupleExpr': {
        const dst = this.regs.alloc(preferredReg);
        const elementRegs = node.elements.map(element => this.compileExpr(element));
        this.emit(Op.BUILD_TUPLE, dst, elementRegs);
        for (const reg of elementRegs) {
          this.regs.release(reg);
        }
        return dst;
      }

      case 'DictExpr': {
        const dst = this.regs.alloc(preferredReg);
        this.emit(Op.BUILD_DICT, dst);
        for (const entry of node.entries) {
          const keyReg = this.compileExpr(entry.key);
          const valueReg = this.compileExpr(entry.value);
          this.emit(Op.INDEX_SET, dst, keyReg, valueReg);
          this.regs.release(valueReg);
          this.regs.release(keyReg);
        }
        return dst;
      }

      case 'IndexExpr': {
        const obj = this.compileExpr(node.object, preferredReg);
        const idx = this.compileExpr(node.index);
        this.emit(Op.INDEX_GET, obj, obj, idx);
        this.regs.release(idx);
        return obj;
      }

      case 'SliceExpr': {
        const obj = this.compileExpr(node.object, preferredReg);
        const startReg = node.start ? this.compileExpr(node.start) : this.emitNoneConst();
        const stopReg = node.stop ? this.compileExpr(node.stop) : this.emitNoneConst();
        const stepReg = node.step ? this.compileExpr(node.step) : this.emitNoneConst();
        this.emit(Op.SLICE, obj, obj, startReg, stopReg, stepReg);
        this.regs.release(stepReg);
        this.regs.release(stopReg);
        this.regs.release(startReg);
        return obj;
      }

      case 'DotExpr': {
        const obj = this.compileExpr(node.object, preferredReg);
        const nameIdx = this.addName(node.attr);
        this.emit(Op.ATTR_GET, obj, obj, nameIdx);
        return obj;
      }

      case 'CallExpr': {
        const calleeReg = this.compileExpr(node.callee, preferredReg);
        const argRegs = node.args.map(a => this.compileExpr(a));
        const kwRegs = node.kwargs.map(arg => this.compileExpr(arg.value));
        const kwNameIdxs = node.kwargs.map(arg => this.addName(arg.name));
        this.emit(Op.CALL, calleeReg, calleeReg, argRegs, kwNameIdxs, kwRegs);
        for (const reg of kwRegs) {
          this.regs.release(reg);
        }
        for (const reg of argRegs) {
          this.regs.release(reg);
        }
        return calleeReg;
      }

      case 'LambdaExpr': {
        return this.compileAnonymousFunction(
          '<lambda>',
          node.params,
          node.defaults,
          [AST.ReturnStmt(node.body)],
          preferredReg
        );
      }

      case 'ListComprehensionExpr': {
        const fnReg = this.compileAnonymousFunction(
          '<listcomp>',
          [],
          [],
          this.buildListComprehensionBody(node),
          preferredReg
        );
        this.emit(Op.CALL, fnReg, fnReg, [], [], []);
        return fnReg;
      }

      default:
        throw new Error(`Unknown expression node: ${node.type}`);
    }
  }

  compileFunction(node) {
    return this.compileCallable(node.name, node.params, node.defaults, node.body);
  }

  compileCallable(name, params, defaults, body) {
    const outerFunctionScopes = this.currentScopeInfo
      ? [...this.outerFunctionScopes, this.currentScopeInfo.localBindings]
      : this.outerFunctionScopes;
    const compiler = new Compiler({ outerFunctionScopes });
    compiler.currentScopeInfo = compiler.analyzeFunctionScope({ params, body });
    for (const stmt of body) {
      compiler.compileStmt(stmt);
    }

    const noneReg = compiler.regs.alloc();
    const noneIdx = compiler.addConstant(NONE);
    compiler.emit(Op.LOAD_CONST, noneReg, noneIdx);
    compiler.emit(Op.RETURN, noneReg);

    const codeObject = createCodeObject(name, params, params.length - defaults.length, {
      instructions: compiler.instructions,
      constants: compiler.constants,
      names: compiler.names,
      registerCount: compiler.regs.max,
    });
    codeObject.scopeInfo = {
      localBindings: [...compiler.currentScopeInfo.localBindings],
      globalNames: [...compiler.currentScopeInfo.globalNames],
      nonlocalNames: [...compiler.currentScopeInfo.nonlocalNames],
    };
    return codeObject;
  }

  compileAnonymousFunction(name, params, defaults, body, preferredReg = null) {
    const defaultRegs = defaults.map(expr => this.compileExpr(expr));
    const codeIdx = this.addConstant(this.compileCallable(name, params, defaults, body));
    const dst = this.regs.alloc(preferredReg);
    this.emit(Op.BUILD_FUNCTION, dst, codeIdx, defaultRegs);
    for (const reg of defaultRegs) {
      this.regs.release(reg);
    }
    return dst;
  }

  buildListComprehensionBody(node) {
    const resultName = this.freshInternalName('listcomp_result');
    const appendStmt = AST.AssignStmt(
      resultName,
      AST.BinaryExpr('+', AST.Identifier(resultName), AST.ListExpr([node.element]))
    );

    // Build the innermost body (the append), then wrap with for/if from inside out
    let body = [appendStmt];

    // Process clauses from last to first to build nested structure
    for (let i = node.clauses.length - 1; i >= 0; i--) {
      const clause = node.clauses[i];
      let loopBody = body;
      if (clause.condition) {
        loopBody = [AST.IfStmt(clause.condition, loopBody, [], null)];
      }
      body = [AST.ForStmt(clause.target, clause.iterable, loopBody)];
    }

    return [
      AST.AssignStmt(resultName, AST.ListExpr([])),
      ...body,
      AST.ReturnStmt(AST.Identifier(resultName)),
    ];
  }

  compileStmt(node) {
    switch (node.type) {
      case 'AssignStmt': {
        const reg = this.compileExpr(node.value);
        const nameIdx = this.addName(node.name);
        this.emit(Op.STORE_VAR, nameIdx, reg);
        this.regs.reset();
        break;
      }

      case 'IndexAssignStmt': {
        const obj = this.compileExpr(node.object);
        const idx = this.compileExpr(node.index);
        const val = this.compileExpr(node.value);
        this.emit(Op.INDEX_SET, obj, idx, val);
        this.regs.reset();
        break;
      }

      case 'DotAssignStmt': {
        const obj = this.compileExpr(node.object);
        const val = this.compileExpr(node.value);
        const nameIdx = this.addName(node.attr);
        this.emit(Op.ATTR_SET, obj, nameIdx, val);
        this.regs.reset();
        break;
      }

      case 'PrintStmt': {
        const argRegs = node.args.map(a => this.compileExpr(a));
        this.emit(Op.PRINT, argRegs);
        this.regs.reset();
        break;
      }

      case 'ExprStmt': {
        this.compileExpr(node.expr);
        this.regs.reset();
        break;
      }

      case 'FunctionDefStmt': {
        const defaultRegs = node.defaults.map(expr => this.compileExpr(expr));
        const codeIdx = this.addConstant(this.compileFunction(node));
        const nameIdx = this.addName(node.name);
        this.emit(Op.DEF_FUNC, nameIdx, codeIdx, defaultRegs);
        this.regs.reset();
        break;
      }

      case 'ClassDefStmt': {
        const baseRegs = node.bases.map(b => this.compileExpr(b));

        // Compile class body as a separate code object
        const classCompiler = new Compiler();
        for (const stmt of node.body) {
          classCompiler.compileStmt(stmt);
        }
        classCompiler.emit(Op.HALT);

        const bodyCodeIdx = this.addConstant({
          kind: 'class_body',
          bytecode: {
            instructions: classCompiler.instructions,
            constants: classCompiler.constants,
            names: classCompiler.names,
            registerCount: classCompiler.regs.max,
          },
        });

        const nameIdx = this.addName(node.name);
        const nameConstIdx = this.addConstant(new PyString(node.name));
        const nameReg = this.regs.alloc();
        this.emit(Op.LOAD_CONST, nameReg, nameConstIdx);
        this.emit(Op.BUILD_CLASS, nameIdx, nameReg, bodyCodeIdx, baseRegs);
        this.regs.release(nameReg);
        for (const reg of baseRegs) this.regs.release(reg);
        this.regs.reset();
        break;
      }

      case 'PassStmt': {
        break;
      }

      case 'ReturnStmt': {
        const reg = node.value ? this.compileExpr(node.value) : this.compileExpr(AST.NoneLiteral());
        this.emit(Op.RETURN, reg);
        this.regs.reset();
        break;
      }

      case 'GlobalStmt':
      case 'NonlocalStmt': {
        break;
      }

      case 'BreakStmt': {
        const loop = this.loopStack[this.loopStack.length - 1];
        if (!loop) {
          throw new SyntaxError("SyntaxError: 'break' outside loop");
        }
        loop.breakJumps.push(this.emit(Op.JMP, 0));
        this.regs.reset();
        break;
      }

      case 'ContinueStmt': {
        const loop = this.loopStack[this.loopStack.length - 1];
        if (!loop) {
          throw new SyntaxError("SyntaxError: 'continue' not properly in loop");
        }
        if (loop.continueTarget !== null) {
          this.emit(Op.JMP, loop.continueTarget);
        } else {
          loop.continueJumps.push(this.emit(Op.JMP, 0));
        }
        this.regs.reset();
        break;
      }

      case 'IfStmt': {
        const condReg = this.compileExpr(node.condition);
        const jumpIfFalse = this.emit(Op.JMP_IF_FALSE, condReg, 0); // placeholder
        this.regs.reset();

        for (const s of node.body) this.compileStmt(s);

        // Collect exit jumps for patching
        const exitJumps = [];

        if (node.elifs.length > 0 || node.elseBody) {
          exitJumps.push(this.emit(Op.JMP, 0)); // placeholder
        }

        this.patch(jumpIfFalse, Op.JMP_IF_FALSE, condReg, this.instructions.length);

        for (const elif of node.elifs) {
          const elifReg = this.compileExpr(elif.condition);
          const elifJump = this.emit(Op.JMP_IF_FALSE, elifReg, 0);
          this.regs.reset();

          for (const s of elif.body) this.compileStmt(s);
          exitJumps.push(this.emit(Op.JMP, 0));

          this.patch(elifJump, Op.JMP_IF_FALSE, elifReg, this.instructions.length);
        }

        if (node.elseBody) {
          for (const s of node.elseBody) this.compileStmt(s);
        }

        const endAddr = this.instructions.length;
        for (const j of exitJumps) {
          this.patch(j, Op.JMP, endAddr);
        }
        break;
      }

      case 'WhileStmt': {
        const loopStart = this.instructions.length;
        const loop = { continueTarget: loopStart, continueJumps: [], breakJumps: [] };
        this.loopStack.push(loop);

        const condReg = this.compileExpr(node.condition);
        const exitJump = this.emit(Op.JMP_IF_FALSE, condReg, 0);
        this.regs.reset();

        for (const s of node.body) this.compileStmt(s);

        this.emit(Op.JMP, loopStart);
        const loopEnd = this.instructions.length;
        this.patch(exitJump, Op.JMP_IF_FALSE, condReg, loopEnd);
        for (const jump of loop.breakJumps) {
          this.patch(jump, Op.JMP, loopEnd);
        }
        this.loopStack.pop();
        break;
      }

      case 'ForStmt': {
        const iterableName = this.freshInternalName('for_iter');
        const indexName = this.freshInternalName('for_index');

        this.compileStmt(AST.AssignStmt(iterableName, node.iterable));
        this.compileStmt(AST.AssignStmt(indexName, AST.NumberLiteral(0)));

        const loopStart = this.instructions.length;
        const loop = { continueTarget: null, continueJumps: [], breakJumps: [] };
        this.loopStack.push(loop);

        const condition = AST.BinaryExpr(
          '<',
          AST.Identifier(indexName),
          AST.CallExpr(AST.Identifier('len'), [AST.Identifier(iterableName)])
        );
        const condReg = this.compileExpr(condition);
        const exitJump = this.emit(Op.JMP_IF_FALSE, condReg, 0);
        this.regs.reset();

        this.compileStmt(
          AST.AssignStmt(
            node.target,
            AST.IndexExpr(AST.Identifier(iterableName), AST.Identifier(indexName))
          )
        );

        for (const s of node.body) this.compileStmt(s);

        loop.continueTarget = this.instructions.length;
        for (const jump of loop.continueJumps) {
          this.patch(jump, Op.JMP, loop.continueTarget);
        }

        this.compileStmt(
          AST.AssignStmt(
            indexName,
            AST.BinaryExpr('+', AST.Identifier(indexName), AST.NumberLiteral(1))
          )
        );

        this.emit(Op.JMP, loopStart);
        const loopEnd = this.instructions.length;
        this.patch(exitJump, Op.JMP_IF_FALSE, condReg, loopEnd);
        for (const jump of loop.breakJumps) {
          this.patch(jump, Op.JMP, loopEnd);
        }
        this.loopStack.pop();
        break;
      }

      case 'TryStmt': {
        // Emit SETUP_TRY pointing to handler chain
        const setupTry = this.emit(Op.SETUP_TRY, 0); // placeholder
        this.regs.reset();

        // Compile try body
        for (const s of node.body) this.compileStmt(s);

        // Pop try handler and jump over except blocks
        this.emit(Op.POP_TRY);
        this.regs.reset();

        // If there's a finally, compile it in the normal path too
        if (node.finallyBody) {
          for (const s of node.finallyBody) this.compileStmt(s);
        }

        const skipHandlers = this.emit(Op.JMP, 0); // placeholder
        this.regs.reset();

        // Patch SETUP_TRY to jump here (start of handlers)
        this.patch(setupTry, Op.SETUP_TRY, this.instructions.length);

        const handlerExits = [];

        if (node.handlers.length > 0) {
          for (let i = 0; i < node.handlers.length; i++) {
            const handler = node.handlers[i];

            if (handler.type) {
              // Typed except: check if exception matches
              const typeReg = this.compileExpr(handler.type);
              const matchReg = this.regs.alloc();
              this.emit(Op.MATCH_EXCEPT, matchReg, typeReg);
              const skipHandler = this.emit(Op.JMP_IF_FALSE, matchReg, 0);
              this.regs.reset();

              // Bind alias if present
              if (handler.alias) {
                const aliasReg = this.regs.alloc();
                const excNameIdx = this.addName('$current_exception_value');
                this.emit(Op.LOAD_VAR, aliasReg, excNameIdx);
                const aliasNameIdx = this.addName(handler.alias);
                this.emit(Op.STORE_VAR, aliasNameIdx, aliasReg);
                this.regs.reset();
              }

              for (const s of handler.body) this.compileStmt(s);

              // If there's a finally, compile it in the handler path too
              if (node.finallyBody) {
                for (const s of node.finallyBody) this.compileStmt(s);
              }

              handlerExits.push(this.emit(Op.JMP, 0));
              this.regs.reset();

              // Patch skip to next handler
              this.patch(skipHandler, Op.JMP_IF_FALSE, matchReg, this.instructions.length);
            } else {
              // Bare except: catch all
              // Bind alias if present
              if (handler.alias) {
                const aliasReg = this.regs.alloc();
                const excNameIdx = this.addName('$current_exception_value');
                this.emit(Op.LOAD_VAR, aliasReg, excNameIdx);
                const aliasNameIdx = this.addName(handler.alias);
                this.emit(Op.STORE_VAR, aliasNameIdx, aliasReg);
                this.regs.reset();
              }

              for (const s of handler.body) this.compileStmt(s);

              // If there's a finally, compile it in the handler path too
              if (node.finallyBody) {
                for (const s of node.finallyBody) this.compileStmt(s);
              }

              handlerExits.push(this.emit(Op.JMP, 0));
              this.regs.reset();
            }
          }

          // If no handler matched, re-raise: run finally then raise
          if (node.finallyBody) {
            for (const s of node.finallyBody) this.compileStmt(s);
          }
          const reraise = this.regs.alloc();
          this.emit(Op.RAISE, reraise, 1); // 1 = re-raise current
          this.regs.reset();
        } else {
          // try/finally without except: run finally then re-raise
          if (node.finallyBody) {
            for (const s of node.finallyBody) this.compileStmt(s);
          }
          const reraise = this.regs.alloc();
          this.emit(Op.RAISE, reraise, 1); // re-raise
          this.regs.reset();
        }

        const endAddr = this.instructions.length;
        this.patch(skipHandlers, Op.JMP, endAddr);
        for (const j of handlerExits) {
          this.patch(j, Op.JMP, endAddr);
        }
        break;
      }

      case 'RaiseStmt': {
        if (node.value) {
          const reg = this.compileExpr(node.value);
          this.emit(Op.RAISE, reg, 0); // 0 = raise new
        } else {
          const reg = this.regs.alloc();
          this.emit(Op.RAISE, reg, 1); // 1 = re-raise current
        }
        this.regs.reset();
        break;
      }

      default:
        throw new Error(`Unknown statement node: ${node.type}`);
    }
  }

  compile(ast) {
    for (const stmt of ast.body) {
      this.compileStmt(stmt);
    }
    this.emit(Op.HALT);

    return {
      instructions: this.instructions,
      constants: this.constants,
      names: this.names,
      registerCount: this.regs.max,
    };
  }
}
