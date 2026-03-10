import { PyObject, PyBuiltinMethod } from './py-object.js';
import { pythonError } from '../../runtime/errors.js';
import { resolveSliceIndices } from './slice-utils.js';
import { PyInt } from './py-int.js';

function buildKeywordMap(kwargs = []) {
  return new Map(kwargs.map(({ name, value }) => [name, value]));
}

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isNumericObject(value) {
  return value && (value.type === 'int' || value.type === 'float' || value.type === 'bool');
}

function parseFormatField(field) {
  let bracketDepth = 0;
  let conversionStart = -1;
  let specStart = -1;

  for (let i = 0; i < field.length; i++) {
    const ch = field[i];
    if (ch === '[') {
      bracketDepth++;
      continue;
    }
    if (ch === ']') {
      bracketDepth--;
      if (bracketDepth < 0) throw pythonError('ValueError', "unmatched ']' in format string");
      continue;
    }
    if (bracketDepth === 0 && ch === '!' && conversionStart === -1 && specStart === -1) {
      conversionStart = i;
      continue;
    }
    if (bracketDepth === 0 && ch === ':' && specStart === -1) {
      specStart = i;
    }
  }

  if (bracketDepth !== 0) throw pythonError('ValueError', "expected ']' before end of string");

  const fieldExprEnd = [conversionStart, specStart].filter(index => index !== -1).sort((a, b) => a - b)[0] ?? field.length;
  const fieldExpr = field.slice(0, fieldExprEnd);
  const conversion = conversionStart === -1
    ? null
    : field.slice(conversionStart + 1, specStart === -1 ? field.length : specStart);
  const formatSpec = specStart === -1 ? '' : field.slice(specStart + 1);

  return { fieldExpr, conversion, formatSpec };
}

function parseFieldAccess(fieldExpr) {
  let i = 0;
  while (i < fieldExpr.length && fieldExpr[i] !== '.' && fieldExpr[i] !== '[') i++;

  const root = fieldExpr.slice(0, i);
  const ops = [];

  while (i < fieldExpr.length) {
    if (fieldExpr[i] === '.') {
      i++;
      const start = i;
      while (i < fieldExpr.length && fieldExpr[i] !== '.' && fieldExpr[i] !== '[') i++;
      const name = fieldExpr.slice(start, i);
      if (!name) throw pythonError('ValueError', 'empty attribute in format string');
      ops.push({ kind: 'attr', name });
      continue;
    }

    if (fieldExpr[i] === '[') {
      const end = fieldExpr.indexOf(']', i + 1);
      if (end === -1) throw pythonError('ValueError', "expected ']' before end of string");
      const token = fieldExpr.slice(i + 1, end);
      if (!token) throw pythonError('ValueError', 'empty index in format string');
      ops.push({ kind: 'index', token });
      i = end + 1;
      continue;
    }

    throw pythonError('ValueError', 'invalid field name in format string');
  }

  return { root, ops };
}

function resolveRootArg(root, args, kwargs, state) {
  if (root === '') {
    if (state.manualFieldUsed) {
      throw pythonError('ValueError', 'cannot switch from manual field specification to automatic field numbering');
    }
    state.autoFieldUsed = true;
    const index = state.nextAutoIndex++;
    if (index >= args.length) {
      throw pythonError('IndexError', `Replacement index ${index} out of range for positional args tuple`);
    }
    return args[index];
  }

  if (state.autoFieldUsed) {
    throw pythonError('ValueError', 'cannot switch from automatic field numbering to manual field specification');
  }
  state.manualFieldUsed = true;

  if (/^[0-9]+$/.test(root)) {
    const index = Number.parseInt(root, 10);
    if (index >= args.length) {
      throw pythonError('IndexError', `Replacement index ${index} out of range for positional args tuple`);
    }
    return args[index];
  }

  if (!kwargs.has(root)) {
    throw pythonError('KeyError', root);
  }
  return kwargs.get(root);
}

function parseIndexToken(token) {
  if (/^-?[0-9]+$/.test(token)) {
    return new PyInt(Number.parseInt(token, 10));
  }
  if (
    (token.startsWith("'") && token.endsWith("'"))
    || (token.startsWith('"') && token.endsWith('"'))
  ) {
    return new PyString(token.slice(1, -1));
  }
  return new PyString(token);
}

function resolveFieldValue(fieldExpr, args, kwargs, state) {
  const { root, ops } = parseFieldAccess(fieldExpr);
  let value = resolveRootArg(root, args, kwargs, state);

  for (const op of ops) {
    if (op.kind === 'attr') {
      if (!value || typeof value.__getattr__ !== 'function') {
        throw pythonError('AttributeError', `'${value?.type}' object has no attribute '${op.name}'`);
      }
      value = value.__getattr__(op.name);
      continue;
    }

    const key = parseIndexToken(op.token);
    if (!value || typeof value.__getitem__ !== 'function') {
      throw pythonError('TypeError', `'${value?.type}' object is not subscriptable`);
    }
    value = value.__getitem__(key);
  }

  return value;
}

function applyConversion(value, conversion) {
  if (!conversion) return value;
  if (conversion === 's') return new PyString(value.__str__());
  if (conversion === 'r') return new PyString(value.__repr__());
  throw pythonError('ValueError', `Unknown conversion specifier ${conversion}`);
}

function numericValue(value, type) {
  if (value.type === 'int' || value.type === 'float') return value.value;
  if (value.type === 'bool') return value.value ? 1 : 0;
  throw pythonError('ValueError', `Unknown format code '${type}' for object of type '${value.type}'`);
}

function parseFormatSpec(formatSpec) {
  if (formatSpec === '') {
    return {
      raw: formatSpec,
      fill: ' ',
      align: null,
      sign: '-',
      alternate: false,
      zero: false,
      width: null,
      precision: null,
      type: null,
    };
  }

  let i = 0;
  let fill = ' ';
  let align = null;

  if (formatSpec.length >= 2 && '<>^='.includes(formatSpec[1])) {
    fill = formatSpec[0];
    align = formatSpec[1];
    i = 2;
  } else if ('<>^='.includes(formatSpec[0])) {
    align = formatSpec[0];
    i = 1;
  }

  let sign = '-';
  if (i < formatSpec.length && '+- '.includes(formatSpec[i])) {
    sign = formatSpec[i];
    i++;
  }

  let alternate = false;
  if (i < formatSpec.length && formatSpec[i] === '#') {
    alternate = true;
    i++;
  }

  let zero = false;
  if (i < formatSpec.length && formatSpec[i] === '0') {
    zero = true;
    i++;
  }

  const widthStart = i;
  while (i < formatSpec.length && isDigit(formatSpec[i])) i++;
  const width = i > widthStart ? Number.parseInt(formatSpec.slice(widthStart, i), 10) : null;

  let precision = null;
  if (i < formatSpec.length && formatSpec[i] === '.') {
    i++;
    const precisionStart = i;
    while (i < formatSpec.length && isDigit(formatSpec[i])) i++;
    if (i === precisionStart) {
      throw pythonError('ValueError', 'Format specifier missing precision');
    }
    precision = Number.parseInt(formatSpec.slice(precisionStart, i), 10);
  }

  const type = i < formatSpec.length ? formatSpec[i] : null;
  if (type !== null) i++;

  if (i !== formatSpec.length) {
    throw pythonError('ValueError', `unsupported format specifier '${formatSpec}'`);
  }

  if (zero && align === null) {
    fill = '0';
    align = '=';
  }

  return { raw: formatSpec, fill, align, sign, alternate, zero, width, precision, type };
}

function trimTrailingZeros(text) {
  return text.replace(/(\.[0-9]*?)0+$/, '$1').replace(/\.$/, '');
}

function normalizeExponent(text, uppercase = false) {
  const marker = uppercase ? 'E' : 'e';
  const parts = text.toLowerCase().split('e');
  if (parts.length !== 2) return uppercase ? text.toUpperCase() : text;

  const mantissa = parts[0];
  const exponent = parts[1];
  const sign = exponent.startsWith('-') ? '-' : '+';
  const digits = exponent.replace(/^[-+]/, '').replace(/^0+/, '') || '0';
  return `${mantissa}${marker}${sign}${digits.padStart(2, '0')}`;
}

function applyAlignment(prefix, body, spec, numeric = false) {
  const align = spec.align ?? (numeric ? '>' : '<');
  const rendered = prefix + body;
  if (spec.width === null || rendered.length >= spec.width) {
    return rendered;
  }

  const padLength = spec.width - rendered.length;
  const padding = spec.fill.repeat(padLength);

  switch (align) {
    case '<':
      return rendered + padding;
    case '^': {
      const left = Math.floor(padLength / 2);
      const right = padLength - left;
      return spec.fill.repeat(left) + rendered + spec.fill.repeat(right);
    }
    case '=':
      return prefix + padding + body;
    case '>':
    default:
      return padding + rendered;
  }
}

function integerPrefix(value, signOption) {
  if (value < 0 || Object.is(value, -0)) return '-';
  if (signOption === '+') return '+';
  if (signOption === ' ') return ' ';
  return '';
}

function ensureStringSpecAllowed(value, spec) {
  if (spec.sign !== '-') {
    throw pythonError('ValueError', 'Sign not allowed in string format specifier');
  }
  if (spec.alternate) {
    throw pythonError('ValueError', 'Alternate form (#) not allowed in string format specifier');
  }
  if (spec.type !== null && spec.type !== 's') {
    throw pythonError('ValueError', `Unknown format code '${spec.type}' for object of type '${value.type}'`);
  }
}

function renderStringValue(value, spec) {
  ensureStringSpecAllowed(value, spec);
  let rendered = value.__str__();
  if (spec.precision !== null) {
    rendered = rendered.slice(0, spec.precision);
  }
  return applyAlignment('', rendered, spec, false);
}

function renderIntegerValue(value, spec) {
  const type = spec.type ?? 'd';
  if (!['b', 'c', 'd', 'n', 'o', 'x', 'X'].includes(type)) {
    throw pythonError('ValueError', `Unknown format code '${type}' for object of type '${value.type}'`);
  }
  if (spec.precision !== null) {
    throw pythonError('ValueError', 'Precision not allowed in integer format specifier');
  }

  const integer = numericValue(value, type);
  const prefix = integerPrefix(integer, spec.sign);
  const absolute = Math.abs(integer);
  let basePrefix = '';
  let body;

  switch (type) {
    case 'b':
      body = absolute.toString(2);
      if (spec.alternate) basePrefix = '0b';
      break;
    case 'c':
      if (spec.alternate) {
        throw pythonError('ValueError', 'Alternate form (#) not allowed with integer format specifier c');
      }
      body = String.fromCodePoint(absolute);
      break;
    case 'o':
      body = absolute.toString(8);
      if (spec.alternate) basePrefix = '0o';
      break;
    case 'x':
      body = absolute.toString(16);
      if (spec.alternate) basePrefix = '0x';
      break;
    case 'X':
      body = absolute.toString(16).toUpperCase();
      if (spec.alternate) basePrefix = '0X';
      break;
    case 'n':
    case 'd':
    default:
      if (spec.alternate) {
        throw pythonError('ValueError', 'Alternate form (#) not allowed with integer format specifier d');
      }
      body = String(absolute);
      break;
  }

  return applyAlignment(prefix + basePrefix, body, spec, true);
}

function renderGeneralNumber(number, precision, alternate) {
  const resolvedPrecision = Math.max(precision ?? 6, 1);
  let rendered = Math.abs(number).toPrecision(resolvedPrecision);
  if (!alternate) {
    if (rendered.includes('e') || rendered.includes('E')) {
      const parts = rendered.toLowerCase().split('e');
      parts[0] = trimTrailingZeros(parts[0]);
      rendered = parts.join('e');
    } else {
      rendered = trimTrailingZeros(rendered);
    }
  }
  return rendered;
}

function renderFloatValue(value, spec) {
  const type = spec.type ?? (spec.precision !== null ? 'g' : null);
  const number = numericValue(value, type ?? 'g');
  const prefix = integerPrefix(number, spec.sign);
  const absolute = Math.abs(number);
  let body;

  switch (type) {
    case null:
      if (spec.alternate) {
        throw pythonError('ValueError', 'Alternate form (#) not allowed for default float formatting');
      }
      body = value.__str__();
      if (body.startsWith('-')) body = body.slice(1);
      break;
    case 'f':
    case 'F':
      body = absolute.toFixed(spec.precision ?? 6);
      if (spec.alternate && !body.includes('.')) body += '.';
      if (type === 'F') body = body.toUpperCase();
      break;
    case 'e':
    case 'E': {
      body = normalizeExponent(absolute.toExponential(spec.precision ?? 6), type === 'E');
      if (!spec.alternate) {
        const marker = type === 'E' ? 'E' : 'e';
        const parts = body.split(marker);
        parts[0] = trimTrailingZeros(parts[0]);
        body = parts.join(marker);
      }
      break;
    }
    case 'g':
    case 'G':
      body = renderGeneralNumber(number, spec.precision, spec.alternate);
      body = normalizeExponent(body, type === 'G');
      if (type === 'G' && !body.includes('E')) body = body.toUpperCase();
      break;
    case '%':
      body = (absolute * 100).toFixed(spec.precision ?? 6);
      if (spec.alternate && !body.includes('.')) body += '.';
      body += '%';
      break;
    case 'n':
      body = renderGeneralNumber(number, spec.precision, spec.alternate);
      body = normalizeExponent(body, false);
      break;
    default:
      throw pythonError('ValueError', `Unknown format code '${type}' for object of type '${value.type}'`);
  }

  return applyAlignment(prefix, body, spec, true);
}

function renderFormattedValue(value, formatSpec) {
  const spec = parseFormatSpec(formatSpec);

  if (!isNumericObject(value)) {
    return renderStringValue(value, spec);
  }

  const type = spec.type;
  if ((type === null && value.type !== 'float' && spec.precision === null) || type === 'b' || type === 'c' || type === 'd' || type === 'o' || type === 'x' || type === 'X') {
    if (value.type === 'float') {
      throw pythonError('ValueError', `Unknown format code '${type}' for object of type '${value.type}'`);
    }
    return renderIntegerValue(value, spec);
  }

  if (type === 'n' && value.type !== 'float') {
    return renderIntegerValue(value, spec);
  }

  return renderFloatValue(value, spec);
}

function formatTemplate(template, args, kwargs) {
  const keywordMap = buildKeywordMap(kwargs);
  const state = { nextAutoIndex: 0, autoFieldUsed: false, manualFieldUsed: false };
  let result = '';

  for (let i = 0; i < template.length; i++) {
    const ch = template[i];

    if (ch === '{') {
      if (template[i + 1] === '{') {
        result += '{';
        i++;
        continue;
      }

      const end = template.indexOf('}', i + 1);
      if (end === -1) {
        throw pythonError('ValueError', "expected '}' before end of string");
      }

      const field = template.slice(i + 1, end);
      const { fieldExpr, conversion, formatSpec } = parseFormatField(field);
      const value = resolveFieldValue(fieldExpr, args, keywordMap, state);
      const converted = applyConversion(value, conversion);
      result += renderFormattedValue(converted, formatSpec);
      i = end;
      continue;
    }

    if (ch === '}') {
      if (template[i + 1] === '}') {
        result += '}';
        i++;
        continue;
      }
      throw pythonError('ValueError', "Single '}' encountered in format string");
    }

    result += ch;
  }

  return new PyString(result);
}

export class PyString extends PyObject {
  constructor(value) {
    super('str');
    this.value = value;
  }

  __repr__() {
    return `'${this.value}'`;
  }

  __str__() {
    return this.value;
  }

  __bool__() {
    return this.value.length > 0;
  }

  __eq__(other) {
    if (other instanceof PyString) return this.value === other.value;
    return false;
  }

  __len__() {
    return this.value.length;
  }

  __getitem__(index) {
    const i = index.value;
    const actual = i < 0 ? this.value.length + i : i;
    if (actual < 0 || actual >= this.value.length) {
      throw pythonError('IndexError', 'string index out of range');
    }
    return new PyString(this.value[actual]);
  }

  __getslice__(start, stop, step) {
    const indices = resolveSliceIndices(this.value.length, start, stop, step);
    return new PyString(indices.map(i => this.value[i]).join(''));
  }

  __contains__(value) {
    if (value.type !== 'str') {
      throw pythonError('TypeError', `'in <string>' requires string as left operand, not '${value.type}'`);
    }
    return this.value.includes(value.value);
  }

  __getattr__(name) {
    const self = this;

    switch (name) {
      case 'format':
        return new PyBuiltinMethod('str.format', (args, kwargs) => {
          return formatTemplate(self.value, args, kwargs);
        }, { acceptsKeywords: true });
      default:
        throw pythonError('AttributeError', `'str' object has no attribute '${name}'`);
    }
  }
}
