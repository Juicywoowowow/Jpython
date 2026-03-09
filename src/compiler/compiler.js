import { Op } from './opcodes.js';
import { instr } from './instruction.js';
import { RegisterAllocator } from './register-allocator.js';
import { PyInt } from '../vm/objects/py-int.js';
import { PyFloat } from '../vm/objects/py-float.js';
import { PyString } from '../vm/objects/py-string.js';
import { PyBool } from '../vm/objects/py-bool.js';
import { NONE } from '../vm/objects/py-none.js';

const BINARY_OPS = {
  '+':  Op.ADD,
  '-':  Op.SUB,
  '*':  Op.MUL,
  '/':  Op.DIV,
  '%':  Op.MOD,
  '==': Op.CMP_EQ,
  '!=': Op.CMP_NE,
  '<':  Op.CMP_LT,
  '>':  Op.CMP_GT,
  '<=': Op.CMP_LE,
  '>=': Op.CMP_GE,
};

export class Compiler {
  constructor() {
    this.instructions = [];
    this.constants = [];
    this.names = [];
    this.regs = new RegisterAllocator();
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

  compileAndExpr(node) {
    const left = this.compileExpr(node.left);
    const skipRight = this.emit(Op.JMP_IF_FALSE, left, 0);
    const right = this.compileExpr(node.right);
    this.emit(Op.MOVE, left, right);
    this.regs.free();
    this.patch(skipRight, Op.JMP_IF_FALSE, left, this.instructions.length);
    return left;
  }

  compileOrExpr(node) {
    const left = this.compileExpr(node.left);
    const evalRight = this.emit(Op.JMP_IF_FALSE, left, 0);
    const skipRight = this.emit(Op.JMP, 0);
    this.patch(evalRight, Op.JMP_IF_FALSE, left, this.instructions.length);
    const right = this.compileExpr(node.right);
    this.emit(Op.MOVE, left, right);
    this.regs.free();
    this.patch(skipRight, Op.JMP, this.instructions.length);
    return left;
  }

  compileExpr(node) {
    switch (node.type) {
      case 'NumberLiteral': {
        const reg = this.regs.alloc();
        const obj = Number.isInteger(node.value) ? new PyInt(node.value) : new PyFloat(node.value);
        const idx = this.addConstant(obj);
        this.emit(Op.LOAD_CONST, reg, idx);
        return reg;
      }

      case 'StringLiteral': {
        const reg = this.regs.alloc();
        const idx = this.addConstant(new PyString(node.value));
        this.emit(Op.LOAD_CONST, reg, idx);
        return reg;
      }

      case 'BoolLiteral': {
        const reg = this.regs.alloc();
        const idx = this.addConstant(new PyBool(node.value));
        this.emit(Op.LOAD_CONST, reg, idx);
        return reg;
      }

      case 'NoneLiteral': {
        const reg = this.regs.alloc();
        const idx = this.addConstant(NONE);
        this.emit(Op.LOAD_CONST, reg, idx);
        return reg;
      }

      case 'Identifier': {
        const reg = this.regs.alloc();
        const nameIdx = this.addName(node.name);
        this.emit(Op.LOAD_VAR, reg, nameIdx);
        return reg;
      }

      case 'UnaryExpr': {
        const operand = this.compileExpr(node.operand);
        if (node.op === '-') {
          this.emit(Op.NEG, operand, operand);
        } else if (node.op === 'not') {
          this.emit(Op.NOT, operand, operand);
        }
        return operand;
      }

      case 'BinaryExpr': {
        if (node.op === 'and') {
          return this.compileAndExpr(node);
        }

        if (node.op === 'or') {
          return this.compileOrExpr(node);
        }

        const opcode = BINARY_OPS[node.op];
        if (opcode === undefined) {
          throw new Error(`Unknown binary operator: ${node.op}`);
        }
        const left = this.compileExpr(node.left);
        const right = this.compileExpr(node.right);
        this.emit(opcode, left, left, right);
        this.regs.free(); // free right
        return left;
      }

      case 'ListExpr': {
        const elemRegs = node.elements.map(el => this.compileExpr(el));
        const startReg = elemRegs.length > 0 ? elemRegs[0] : 0;
        const dst = elemRegs.length > 0 ? startReg : this.regs.alloc();
        this.emit(Op.BUILD_LIST, dst, startReg, elemRegs.length);
        // Free all element regs except dst
        for (let i = elemRegs.length - 1; i > 0; i--) {
          this.regs.free();
        }
        return dst;
      }

      case 'IndexExpr': {
        const obj = this.compileExpr(node.object);
        const idx = this.compileExpr(node.index);
        this.emit(Op.INDEX_GET, obj, obj, idx);
        this.regs.free();
        return obj;
      }

      case 'CallExpr': {
        const calleeReg = this.compileExpr(node.callee);
        const argRegs = node.args.map(a => this.compileExpr(a));
        const argStart = argRegs.length > 0 ? argRegs[0] : 0;
        this.emit(Op.CALL, calleeReg, calleeReg, argStart, argRegs.length);
        for (let i = argRegs.length - 1; i >= 0; i--) {
          this.regs.free();
        }
        return calleeReg;
      }

      default:
        throw new Error(`Unknown expression node: ${node.type}`);
    }
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

      case 'PrintStmt': {
        const argRegs = node.args.map(a => this.compileExpr(a));
        const argStart = argRegs.length > 0 ? argRegs[0] : 0;
        this.emit(Op.PRINT, argStart, argRegs.length);
        this.regs.reset();
        break;
      }

      case 'ExprStmt': {
        this.compileExpr(node.expr);
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
        const condReg = this.compileExpr(node.condition);
        const exitJump = this.emit(Op.JMP_IF_FALSE, condReg, 0);
        this.regs.reset();

        for (const s of node.body) this.compileStmt(s);

        this.emit(Op.JMP, loopStart);
        this.patch(exitJump, Op.JMP_IF_FALSE, condReg, this.instructions.length);
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
    };
  }
}
