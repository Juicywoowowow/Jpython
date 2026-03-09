export const Op = {
  LOAD_CONST:    0x01,
  LOAD_VAR:      0x02,
  STORE_VAR:     0x03,
  ADD:           0x10,
  SUB:           0x11,
  MUL:           0x12,
  DIV:           0x13,
  MOD:           0x14,
  NEG:           0x15,
  CMP_EQ:        0x20,
  CMP_NE:        0x21,
  CMP_LT:        0x22,
  CMP_GT:        0x23,
  CMP_LE:        0x24,
  CMP_GE:        0x25,
  AND:           0x26,
  OR:            0x27,
  NOT:           0x28,
  JMP:           0x30,
  JMP_IF_FALSE:  0x31,
  CALL:          0x40,
  PRINT:         0x41,
  MOVE:          0x50,
  INDEX_GET:     0x60,
  INDEX_SET:     0x61,
  BUILD_LIST:    0x62,
  HALT:          0xFF,
};

export const OpNames = Object.fromEntries(
  Object.entries(Op).map(([k, v]) => [v, k])
);
