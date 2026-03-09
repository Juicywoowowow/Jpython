export class OutputCapture {
  constructor() {
    this.lines = [];
  }

  write(str) {
    this.lines.push(str);
  }

  getOutput() {
    return this.lines.join('');
  }

  getLines() {
    const full = this.lines.join('');
    if (full === '') return [];
    const result = full.endsWith('\n') ? full.slice(0, -1) : full;
    return result.split('\n');
  }

  reset() {
    this.lines = [];
  }
}
