const MAX_REGISTERS = 16;

export class RegisterAllocator {
  constructor() {
    this.next = 0;
    this.max = 0;
  }

  alloc() {
    if (this.next >= MAX_REGISTERS) {
      throw new Error('Register overflow: expression too complex (max 16 registers)');
    }
    const reg = this.next++;
    if (this.next > this.max) this.max = this.next;
    return reg;
  }

  free() {
    if (this.next > 0) this.next--;
  }

  reset() {
    this.next = 0;
  }
}
