// Helpers for the weapon settings stored on `character.parts`.
//
// Storage shape (each layer falls back to the next when missing):
//   parts.weaponAnimOffsets[weapon][animation]  — per-(weapon × animation)
//   parts.weaponOffsets[weapon]                 — per-weapon default
//   parts.weaponOffset                          — legacy single offset
//   { x:0, y:0, rotation:0 }                    — final fallback
//
//   parts.weaponScales[weapon]      — per-weapon (1.0 if unset)
//   parts.partScales.weapon         — legacy fallback
//
// All three callers (renderer, UI display, mutate path) read through these
// helpers so the fallback chain stays in one place.

export const ZERO_OFFSET = { x: 0, y: 0, rotation: 0 };

export function resolveWeaponOffset(parts, animation) {
  if (!parts) return ZERO_OFFSET;
  const weapon = parts.weapon;
  if (!weapon || weapon === 'none') return ZERO_OFFSET;
  return parts.weaponAnimOffsets?.[weapon]?.[animation]
      ?? parts.weaponOffsets?.[weapon]
      ?? parts.weaponOffset
      ?? ZERO_OFFSET;
}

export function resolveWeaponScale(parts) {
  if (!parts) return 1;
  const weapon = parts.weapon;
  if (!weapon || weapon === 'none') return 1;
  return parts.weaponScales?.[weapon]
      ?? parts.partScales?.weapon
      ?? 1;
}

// Accessory scale — stored per weapon key so each weapon's right-arm
// accessory can be sized independently.
export function resolveAccessoryScale(parts) {
  if (!parts) return 1;
  const weapon = parts.weapon;
  if (!weapon || weapon === 'none') return 1;
  return parts.accessoryScales?.[weapon] ?? 1;
}

// Accessory offset fallback chain:
//   parts.accessoryAnimOffsets[animation]  — per-animation
//   parts.accessoryOffset                  — default
//   { x:0, y:0, rotation:0 }
export function resolveAccessoryOffset(parts, animation) {
  if (!parts) return ZERO_OFFSET;
  return parts.accessoryAnimOffsets?.[animation]
      ?? parts.accessoryOffset
      ?? ZERO_OFFSET;
}

// Body accessory — a single PNG anchored to the torso (not per-weapon, so a
// cape / emblem / backpack persists across weapon swaps).
export function resolveBodyAccessoryScale(parts) {
  if (!parts) return 1;
  return parts.bodyAccessoryScale ?? 1;
}

// Body accessory offset fallback chain:
//   parts.bodyAccessoryAnimOffsets[animation]  — per-animation
//   parts.bodyAccessoryOffset                  — default
//   { x:0, y:0, rotation:0 }
export function resolveBodyAccessoryOffset(parts, animation) {
  if (!parts) return ZERO_OFFSET;
  return parts.bodyAccessoryAnimOffsets?.[animation]
      ?? parts.bodyAccessoryOffset
      ?? ZERO_OFFSET;
}

// Body FRONT accessory — like the back accessory (single PNG on the torso,
// persists across weapons) but drawn above both arms and below the head.
export function resolveBodyFrontAccessoryScale(parts) {
  if (!parts) return 1;
  return parts.bodyFrontAccessoryScale ?? 1;
}

// Same fallback chain as the back accessory:
//   parts.bodyFrontAccessoryAnimOffsets[animation] → parts.bodyFrontAccessoryOffset → zero
export function resolveBodyFrontAccessoryOffset(parts, animation) {
  if (!parts) return ZERO_OFFSET;
  return parts.bodyFrontAccessoryAnimOffsets?.[animation]
      ?? parts.bodyFrontAccessoryOffset
      ?? ZERO_OFFSET;
}

// ── Weapon TYPE ───────────────────────────────────────────────────────────────
// `parts.weapon` is either a built-in key ('sword', 'rifle', …, 'none') or a
// legacy custom key ('cw_…') whose behaviour comes from its `template`. Every
// caller resolves the type through these — never inline the `customWeapons`
// lookup again.

export const MELEE_WEAPONS = new Set(['sword']);

/** The built-in weapon key that drives this character's animation set and melee rules. */
export function resolveWeaponTemplate(character) {
  const weapon = character?.parts?.weapon ?? 'none';
  return character?.customWeapons?.find(w => w.key === weapon)?.template ?? weapon;
}

export function isMeleeWeapon(character) {
  return MELEE_WEAPONS.has(resolveWeaponTemplate(character));
}

export function hasWeapon(character) {
  const w = character?.parts?.weapon;
  return !!w && w !== 'none';
}
