---
name: bake-defaults
description: Extract live state from the active character in `characters.json` into the constants in `src/data/defaultBuild.js`, so every newly created character starts with that build. Invoke when the user says "make X the default", "bake this build", "make this the new-character default", or similar.
---

# bake-defaults

Snapshot the live state of the first character in `characters.json` and patch
the matching constants in `src/data/defaultBuild.js` so new characters spawn
from it.

## What gets baked

The active character (`characters.json[0]`) maps to defaults like this. Patch
**only** the constants that have non-trivial diffs — leave untouched ones alone.

| Live path                                   | Default constant                       |
|---------------------------------------------|----------------------------------------|
| `parts.customColors`                        | `DEFAULT_BUILD_COLORS`                 |
| `boneOffsets`                               | `DEFAULT_BUILD_BONE_OFFSETS`           |
| `skinOverrides`                             | `DEFAULT_BUILD_SKIN_OVERRIDES`         |
| `animBoneOffsets`                           | `DEFAULT_ANIM_BONE_OFFSETS`            |
| `animKeyframeOverrides`                     | `DEFAULT_ANIM_KEYFRAME_OVERRIDES`      |
| `parts.weaponOffsets`                       | `DEFAULT_WEAPON_OFFSETS`               |
| `parts.weaponAnimOffsets`                   | `DEFAULT_WEAPON_ANIM_OFFSETS`          |
| `parts.weaponScales`                        | `DEFAULT_WEAPON_SCALES`                |

## Do NOT bake

Per-character identity, not animation/build settings:

- `parts.bodyImage`, `parts.headImage`, `parts.weaponImages` — PNG reskins.
- `parts.weaponImage` — legacy single field, ignore.
- `name`, `id` — character-specific.
- `defaultBoneOffsets`, `defaultSkinOverrides` — those are the per-character
  reset targets and shouldn't propagate to all new characters.

Mention these to the user as **skipped** if any are present, so they know.

## Workflow

1. **Read** `characters.json` and `src/data/defaultBuild.js`.

2. **Diff** each constant above against the corresponding live path. Compare
   values, not references — a constant present in both but unchanged should
   not be rewritten.

   For `animKeyframeOverrides`, keys are time-string strings like `"0.00"`,
   `"0.85"`. Preserve that key format.

3. **Report a concise summary** before writing — list which constants will
   change, with one line per top-level key added/changed/removed. Example:

   ```
   DEFAULT_ANIM_BONE_OFFSETS:
     + rifle_jump: 6 bones
     ~ rifle: right_arm.rotation (–0.356 → –0.325)
     ~ rifle: right_forearm.rotation (0.478 → 0.462)
   DEFAULT_WEAPON_SCALES:
     ~ rifle: 1.5 → 1.7
   ```

   Do not show full values unless the user asks; the table above is enough.

4. **Patch** `src/data/defaultBuild.js` in place. Use surgical `Edit` calls
   on the matching `export const` blocks. Preserve formatting: aligned-column
   object literals where the file already uses them, JSON-shaped time keys
   in quotes (`'0.00'`), and the existing two-space indent.

5. **Confirm** in one sentence what was written and remind the user that new
   characters created via the **+** button will inherit the new defaults
   (existing characters are not migrated).

## Gotchas

- `cloneNested` in `App.jsx` is what spreads the defaults into a new
  character — make sure any new top-level field you add is also passed
  through that path (check `newCharacter()` and `duplicateCharacter()`).

- Numeric values can have floating-point noise. Don't reformat numbers like
  `1.2525131116893178` into shorter forms — preserve the JSON values.

- For very large objects (`DEFAULT_ANIM_BONE_OFFSETS` is the worst), don't
  rewrite the whole `export const` block; do a targeted `Edit` on the
  affected nested keys only. Multiple smaller Edits beat one large Write.

- If `characters.json` has more than one character, default to the **first**
  but tell the user and offer to switch.

- If the diff is empty, say so and stop — no edit needed.
