export function isTruthy(obj) {
  return obj.__bool__();
}
