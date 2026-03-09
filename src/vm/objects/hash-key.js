import { pythonError } from '../../runtime/errors.js';

const objectIds = new WeakMap();
let nextObjectId = 1;

function numericKey(value) {
  return `num:${Object.is(value, -0) ? 0 : value}`;
}

export function keyId(key) {
  switch (key.type) {
    case 'int':
    case 'float':
      return numericKey(key.value);
    case 'bool':
      return numericKey(key.value ? 1 : 0);
    case 'NoneType':
      return 'none';
    case 'str':
      return `str:${key.value}`;
    case 'tuple':
      return `tuple:${key.items.map(item => keyId(item)).join('|')}`;
    case 'list':
    case 'dict':
      throw pythonError('TypeError', `unhashable type: '${key.type}'`);
    default:
      if (!objectIds.has(key)) {
        objectIds.set(key, nextObjectId++);
      }
      return `obj:${objectIds.get(key)}`;
  }
}