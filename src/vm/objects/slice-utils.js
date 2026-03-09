export function resolveSliceIndices(length, startObj, stopObj, stepObj) {
  const step = stepObj?.type === 'NoneType' || stepObj == null ? 1 : stepObj.value;
  if (step === 0) {
    throw new Error('ValueError: slice step cannot be zero');
  }

  let start, stop;

  if (step > 0) {
    start = startObj?.type === 'NoneType' || startObj == null ? 0 : startObj.value;
    stop = stopObj?.type === 'NoneType' || stopObj == null ? length : stopObj.value;
  } else {
    start = startObj?.type === 'NoneType' || startObj == null ? length - 1 : startObj.value;
    stop = stopObj?.type === 'NoneType' || stopObj == null ? -(length + 1) : stopObj.value;
  }

  // Clamp negative indices
  if (start < 0) start = Math.max(start + length, step > 0 ? 0 : -1);
  if (start >= length) start = step > 0 ? length : length - 1;
  if (stop < 0) stop = Math.max(stop + length, step > 0 ? 0 : -1);
  if (stop >= length) stop = step > 0 ? length : length - 1;

  const result = [];
  if (step > 0) {
    for (let i = start; i < stop; i += step) result.push(i);
  } else {
    for (let i = start; i > stop; i += step) result.push(i);
  }
  return result;
}
