import { PyObject } from './py-object.js';

export class PyNone extends PyObject {
  constructor() {
    super('NoneType');
  }

  __repr__() {
    return 'None';
  }

  __str__() {
    return 'None';
  }

  __bool__() {
    return false;
  }

  __eq__(other) {
    return other instanceof PyNone;
  }
}

export const NONE = new PyNone();
