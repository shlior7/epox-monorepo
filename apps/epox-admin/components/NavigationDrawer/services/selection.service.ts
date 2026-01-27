export function toggleInSet<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function clearSet<T>() {
  return new Set<T>();
}

export function toArray<T>(set: Set<T>) {
  return Array.from(set);
}
