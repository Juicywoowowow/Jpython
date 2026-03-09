export class RegisterAllocator {
  constructor() {
    this.next = 0;
    this.max = 0;
    this.freeList = [];
    this.live = new Set();
  }

  alloc(preferred = null) {
    if (preferred !== null && preferred !== undefined) {
      if (preferred === this.next) {
        this.next++;
        this.live.add(preferred);
        if (this.next > this.max) this.max = this.next;
        return preferred;
      }

      const preferredIndex = this.freeList.indexOf(preferred);
      if (preferredIndex !== -1) {
        this.freeList.splice(preferredIndex, 1);
        this.live.add(preferred);
        return preferred;
      }
    }

    const reg = this.freeList.length > 0 ? this.freeList.shift() : this.next++;
    this.live.add(reg);
    if (reg + 1 > this.max) this.max = reg + 1;
    return reg;
  }

  release(reg) {
    if (reg === null || reg === undefined || !this.live.has(reg)) return;

    this.live.delete(reg);
    if (!this.freeList.includes(reg)) {
      this.freeList.push(reg);
      this.freeList.sort((a, b) => a - b);
    }
  }

  reset() {
    this.next = 0;
    this.freeList = [];
    this.live.clear();
  }
}
