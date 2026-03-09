const PYTHON_ERROR_PATTERN = /^([A-Za-z]+Error):\s*([\s\S]*)$/;

export class JPythonError extends Error {
  constructor(typeName, detail, traceback = []) {
    super('');
    this.typeName = typeName;
    this.detail = detail;
    this.traceback = [...traceback];
    this.refreshMessage();
  }

  addFrame(frameName) {
    if (frameName) {
      this.traceback.unshift(frameName);
      this.refreshMessage();
    }
    return this;
  }

  refreshMessage() {
    if (this.traceback.length > 0) {
      this.message = [
        'Traceback (most recent call last):',
        ...this.traceback.map(frame => `  in ${frame}`),
        `${this.typeName}: ${this.detail}`,
      ].join('\n');
    } else {
      this.message = `${this.typeName}: ${this.detail}`;
    }
  }
}

export function pythonError(typeName, detail) {
  return new JPythonError(typeName, detail);
}

export function normalizeRuntimeError(err) {
  if (err instanceof JPythonError) return err;
  const message = err?.message ?? String(err);
  const match = message.match(PYTHON_ERROR_PATTERN);
  if (!match) return err;
  return new JPythonError(match[1], match[2]);
}

export function addTracebackFrame(err, frameName) {
  const normalized = normalizeRuntimeError(err);
  if (!(normalized instanceof JPythonError)) return normalized;
  return normalized.addFrame(frameName);
}