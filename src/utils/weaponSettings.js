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
