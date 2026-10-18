/**
 * `base`, or `base<sep>2`, `base<sep>3`, … — the first name not already in
 * `taken` (a Set or an array). Used for folder names (sep ' '), export file
 * names and export directories (sep '_').
 */
export function uniqueName(base, taken, sep = '_') {
  const has = taken instanceof Set ? (n) => taken.has(n) : (n) => taken.includes(n);
  if (!has(base)) return base;
  let n = 2;
  while (has(`${base}${sep}${n}`)) n++;
  return `${base}${sep}${n}`;
}
