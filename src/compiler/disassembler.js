import { Op, OpNames } from './opcodes.js';

function repr(value) {
  if (value && typeof value.__repr__ === 'function') {
    return value.__repr__();
  }
  return String(value);
}

function formatRegister(reg) {
  return `r${reg}`;
}

function formatRegisterList(regs) {
  return `[${regs.map(formatRegister).join(', ')}]`;
}

function formatArgs(instruction, bytecode) {
  const { op, args } = instruction;
  const { constants, names } = bytecode;

  switch (op) {
    case Op.LOAD_CONST:
      return `${formatRegister(args[0])}, const[${args[1]}] (${repr(constants[args[1]])})`;
    case Op.LOAD_VAR:
      return `${formatRegister(args[0])}, name[${args[1]}] (${names[args[1]]})`;
    case Op.STORE_VAR:
      return `name[${args[0]}] (${names[args[0]]}), ${formatRegister(args[1])}`;
    case Op.JMP:
      return `${args[0]}`;
    case Op.JMP_IF_FALSE:
      return `${formatRegister(args[0])}, ${args[1]}`;
    case Op.PRINT:
      return `${formatRegisterList(args[0] || [])}`;
    case Op.CALL:
      return `${formatRegister(args[0])}, ${formatRegister(args[1])}, args=${formatRegisterList(args[2] || [])}, kw=${(args[3] || []).map((idx, i) => `${names[idx]}:${formatRegister((args[4] || [])[i])}`).join(', ')}`;
    case Op.DEF_FUNC:
      return `name[${args[0]}] (${names[args[0]]}), const[${args[1]}] (${repr(constants[args[1]])}), defaults=${formatRegisterList(args[2] || [])}`;
    case Op.BUILD_FUNCTION:
      return `${formatRegister(args[0])}, const[${args[1]}] (${repr(constants[args[1]])}), defaults=${formatRegisterList(args[2] || [])}`;
    case Op.RETURN:
      return `${formatRegister(args[0])}`;
    case Op.BUILD_LIST:
      return `${formatRegister(args[0])}`;
    case Op.BUILD_DICT:
      return `${formatRegister(args[0])}`;
    case Op.BUILD_TUPLE:
      return `${formatRegister(args[0])}, ${formatRegisterList(args[1] || [])}`;
    case Op.LIST_APPEND:
      return `${formatRegister(args[0])}, ${formatRegister(args[1])}`;
    case Op.SETUP_TRY:
      return `handler=${args[0]}`;
    case Op.POP_TRY:
      return '';
    case Op.RAISE:
      return `${formatRegister(args[0])}, mode=${args[1] === 1 ? 're-raise' : 'new'}`;
    case Op.MATCH_EXCEPT:
      return `${formatRegister(args[0])}, ${formatRegister(args[1])}`;
    default:
      return args.map(arg => Array.isArray(arg)
        ? formatRegisterList(arg)
        : (Number.isInteger(arg) ? formatRegister(arg) : String(arg))).join(', ');
  }
}

export function disassemble(bytecode) {
  const constants = bytecode.constants.length > 0
    ? bytecode.constants.map((value, index) => `  [${index}] ${repr(value)}`).join('\n')
    : '  (none)';

  const names = bytecode.names.length > 0
    ? bytecode.names.map((value, index) => `  [${index}] ${value}`).join('\n')
    : '  (none)';

  const instructions = bytecode.instructions
    .map((instruction, index) => {
      const name = OpNames[instruction.op] ?? `OP_${instruction.op}`;
      const renderedArgs = formatArgs(instruction, bytecode);
      return `${String(index).padStart(4, '0')}  ${name.padEnd(12)}${renderedArgs}`;
    })
    .join('\n');

  return [
    '== constants ==',
    constants,
    '',
    '== names ==',
    names,
    '',
    '== instructions ==',
    instructions,
    '',
    `== registers ==\n  ${bytecode.registerCount ?? 0}`,
  ].join('\n');
}