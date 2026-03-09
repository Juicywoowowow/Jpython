import { Op } from '../compiler/opcodes.js';
import { PyInt } from './objects/py-int.js';
import { PyFloat } from './objects/py-float.js';
import { PyString } from './objects/py-string.js';
import { PyBool } from './objects/py-bool.js';
import { PyList } from './objects/py-list.js';
import { NONE } from './objects/py-none.js';
import { coerceArithmetic, wrapNumber } from './objects/coerce.js';
import { isTruthy } from './objects/truthy.js';
import { Environment } from '../runtime/environment.js';

const NUM_REGISTERS = 16;

export class VM {
  constructor(output) {
    this.registers = new Array(NUM_REGISTERS).fill(null);
    this.env = new Environment();
    this.output = output || { write(str) { process.stdout.write(str); } };
  }

  run(bytecode) {
    const { instructions, constants, names } = bytecode;
    let pc = 0;

    while (pc < instructions.length) {
      const { op, args } = instructions[pc];
      pc++;

      switch (op) {
        case Op.LOAD_CONST: {
          this.registers[args[0]] = constants[args[1]];
          break;
        }

        case Op.LOAD_VAR: {
          this.registers[args[0]] = this.env.get(names[args[1]]);
          break;
        }

        case Op.STORE_VAR: {
          this.env.set(names[args[0]], this.registers[args[1]]);
          break;
        }

        case Op.ADD: {
          const left = this.registers[args[1]];
          const right = this.registers[args[2]];
          if (left.type === 'str' && right.type === 'str') {
            this.registers[args[0]] = new PyString(left.value + right.value);
          } else if (left.type === 'list' && right.type === 'list') {
            this.registers[args[0]] = new PyList([...left.items, ...right.items]);
          } else {
            const { l, r, isFloat } = coerceArithmetic(left, right);
            this.registers[args[0]] = wrapNumber(l + r, isFloat);
          }
          break;
        }

        case Op.SUB: {
          const { l, r, isFloat } = coerceArithmetic(this.registers[args[1]], this.registers[args[2]]);
          this.registers[args[0]] = wrapNumber(l - r, isFloat);
          break;
        }

        case Op.MUL: {
          const left = this.registers[args[1]];
          const right = this.registers[args[2]];
          if (left.type === 'str' && right.type === 'int') {
            this.registers[args[0]] = new PyString(left.value.repeat(right.value));
          } else if (left.type === 'int' && right.type === 'str') {
            this.registers[args[0]] = new PyString(right.value.repeat(left.value));
          } else {
            const { l, r, isFloat } = coerceArithmetic(left, right);
            this.registers[args[0]] = wrapNumber(l * r, isFloat);
          }
          break;
        }

        case Op.DIV: {
          const lv = this.registers[args[1]].value;
          const rv = this.registers[args[2]].value;
          if (rv === 0) throw new Error('ZeroDivisionError: division by zero');
          this.registers[args[0]] = new PyFloat(lv / rv);
          break;
        }

        case Op.MOD: {
          const { l, r, isFloat } = coerceArithmetic(this.registers[args[1]], this.registers[args[2]]);
          if (r === 0) throw new Error('ZeroDivisionError: modulo by zero');
          this.registers[args[0]] = wrapNumber(((l % r) + r) % r, isFloat);
          break;
        }

        case Op.NEG: {
          const val = this.registers[args[1]];
          if (val.type === 'float') {
            this.registers[args[0]] = new PyFloat(-val.value);
          } else {
            this.registers[args[0]] = new PyInt(-val.value);
          }
          break;
        }

        case Op.CMP_EQ: {
          const eq = this.registers[args[1]].__eq__(this.registers[args[2]]);
          this.registers[args[0]] = new PyBool(eq);
          break;
        }

        case Op.CMP_NE: {
          const eq = this.registers[args[1]].__eq__(this.registers[args[2]]);
          this.registers[args[0]] = new PyBool(!eq);
          break;
        }

        case Op.CMP_LT: {
          const { l, r } = coerceArithmetic(this.registers[args[1]], this.registers[args[2]]);
          this.registers[args[0]] = new PyBool(l < r);
          break;
        }

        case Op.CMP_GT: {
          const { l, r } = coerceArithmetic(this.registers[args[1]], this.registers[args[2]]);
          this.registers[args[0]] = new PyBool(l > r);
          break;
        }

        case Op.CMP_LE: {
          const { l, r } = coerceArithmetic(this.registers[args[1]], this.registers[args[2]]);
          this.registers[args[0]] = new PyBool(l <= r);
          break;
        }

        case Op.CMP_GE: {
          const { l, r } = coerceArithmetic(this.registers[args[1]], this.registers[args[2]]);
          this.registers[args[0]] = new PyBool(l >= r);
          break;
        }

        case Op.AND: {
          const left = this.registers[args[1]];
          const right = this.registers[args[2]];
          this.registers[args[0]] = isTruthy(left) ? right : left;
          break;
        }

        case Op.OR: {
          const left = this.registers[args[1]];
          const right = this.registers[args[2]];
          this.registers[args[0]] = isTruthy(left) ? left : right;
          break;
        }

        case Op.NOT: {
          const val = this.registers[args[1]];
          this.registers[args[0]] = new PyBool(!isTruthy(val));
          break;
        }

        case Op.JMP: {
          pc = args[0];
          break;
        }

        case Op.JMP_IF_FALSE: {
          if (!isTruthy(this.registers[args[0]])) {
            pc = args[1];
          }
          break;
        }

        case Op.PRINT: {
          const startReg = args[0];
          const count = args[1];
          const parts = [];
          for (let i = 0; i < count; i++) {
            parts.push(this.registers[startReg + i].__str__());
          }
          this.output.write(parts.join(' ') + '\n');
          break;
        }

        case Op.CALL: {
          const callee = this.registers[args[1]];
          const argStart = args[2];
          const argCount = args[3];
          const callArgs = [];
          for (let i = 0; i < argCount; i++) {
            callArgs.push(this.registers[argStart + i]);
          }
          if (callee && typeof callee.__call__ === 'function') {
            this.registers[args[0]] = callee.__call__(callArgs);
          } else {
            throw new Error(`TypeError: '${callee?.type}' object is not callable`);
          }
          break;
        }

        case Op.INDEX_GET: {
          const obj = this.registers[args[1]];
          const idx = this.registers[args[2]];
          if (typeof obj.__getitem__ === 'function') {
            this.registers[args[0]] = obj.__getitem__(idx);
          } else {
            throw new Error(`TypeError: '${obj.type}' object is not subscriptable`);
          }
          break;
        }

        case Op.INDEX_SET: {
          const obj = this.registers[args[0]];
          const idx = this.registers[args[1]];
          const val = this.registers[args[2]];
          if (typeof obj.__setitem__ === 'function') {
            obj.__setitem__(idx, val);
          } else {
            throw new Error(`TypeError: '${obj.type}' object does not support item assignment`);
          }
          break;
        }

        case Op.BUILD_LIST: {
          const start = args[1];
          const count = args[2];
          const items = [];
          for (let i = 0; i < count; i++) {
            items.push(this.registers[start + i]);
          }
          this.registers[args[0]] = new PyList(items);
          break;
        }

        case Op.MOVE: {
          this.registers[args[0]] = this.registers[args[1]];
          break;
        }

        case Op.HALT: {
          return;
        }

        default:
          throw new Error(`Unknown opcode: 0x${op.toString(16)}`);
      }
    }
  }
}
