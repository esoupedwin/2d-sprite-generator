/** Returns a short random alphanumeric ID suitable for in-memory object identity. */
export function genId() {
  return Math.random().toString(36).slice(2, 9);
}
