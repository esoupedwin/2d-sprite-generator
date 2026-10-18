// Helpers for the character object itself (not its parts): optional fields,
// folders, display label, and normalisation of saved data on the way in.
import { uniqueName } from './names.js';

/**
 * Copy of `obj` with `key` set to `value`, or with the key REMOVED when the
 * value is empty/false. Returns `obj` itself when nothing would change, so
 * callers inside setState updaters don't trigger needless re-renders.
 */
export function withOptional(obj, key, value) {
  if (value) return obj[key] === value ? obj : { ...obj, [key]: value };
  if (!(key in obj)) return obj;
  const next = { ...obj };
  delete next[key];
  return next;
}

/** What to call a character in exports and summaries: its own name, else the workspace label. */
export function characterLabel(c) {
  return c?.displayName || c?.name || 'character';
}

// ── Folders (one level) ───────────────────────────────────────────────────────
// Membership is `character.folder` (a folder NAME); the ordered `folders` list
// carries the order and lets empty folders exist.

/** The folder list plus any name found on a character but missing from it — nothing is ever orphaned. */
export function mergeFolders(list, chars) {
  const out = Array.isArray(list) ? list.filter(n => typeof n === 'string' && n.trim()) : [];
  const seen = new Set(out);
  for (const c of chars ?? []) {
    const f = c?.folder;
    if (typeof f === 'string' && f.trim() && !seen.has(f)) { seen.add(f); out.push(f); }
  }
  return out;
}

/** `base`, `base 2`, … not already in `existing` (ignoring `skip`, the folder being renamed). */
export function uniqueFolderName(base, existing, skip = null) {
  return uniqueName(base, existing.filter(n => n !== skip), ' ');
}

/** The folder a character is shown under: its `folder` when that folder exists, else root (null). */
export function folderOf(c, folders) {
  const f = c?.folder;
  return f && folders.includes(f) ? f : null;
}

// ── Load-time normalisation ───────────────────────────────────────────────────
// Applied at every ingress (localStorage, characters.json, workspace file) so
// the rest of the app never meets a legacy key or a missing array.
const DEAD_ROOT_KEYS  = ['hiddenWeapons'];                       // removed with the TYPES panel
const DEAD_PARTS_KEYS = ['animHeadImages', 'animHeadImageScales']; // head skin is character-wide now

export function normalizeCharacter(c) {
  if (!c || typeof c !== 'object') return c;
  const out = { ...c, parts: { ...(c.parts ?? {}) } };
  for (const k of DEAD_ROOT_KEYS)  delete out[k];
  for (const k of DEAD_PARTS_KEYS) delete out.parts[k];
  out.customWeapons    ??= [];
  out.customAnimations ??= [];
  out.hiddenAnimations ??= [];
  return out;
}

export function normalizeCharacters(list) {
  return Array.isArray(list) ? list.map(normalizeCharacter) : list;
}
