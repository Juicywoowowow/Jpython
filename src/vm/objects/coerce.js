import { PyInt } from './py-int.js';
import { PyFloat } from './py-float.js';
import { PyString } from './py-string.js';
import { PyBool } from './py-bool.js';

export function coerceArithmetic(left, right) {
  if (left.type === 'float' || right.type === 'float') {
    const l = (left instanceof PyBool) ? (left.value ? 1.0 : 0.0) : left.value;
    const r = (right instanceof PyBool) ? (right.value ? 1.0 : 0.0) : right.value;
    return { l, r, isFloat: true };
  }
  const l = (left instanceof PyBool) ? (left.value ? 1 : 0) : left.value;
  const r = (right instanceof PyBool) ? (right.value ? 1 : 0) : right.value;
  return { l, r, isFloat: false };
}

export function wrapNumber(value, isFloat) {
  return isFloat ? new PyFloat(value) : new PyInt(value);
}
