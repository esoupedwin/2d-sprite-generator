---
name: add-weapon
description: Add a new weapon type to the character system end-to-end — part definition, animation stubs, registration in animation sets, upload-dialog silhouette, and one-shot completion targets. Invoke when the user says "add a weapon called X", "create a new weapon type X", "make a new weapon", etc.
---

# add-weapon

Wire a new weapon through all the files that need to know about it. Without
this checklist, it's easy to miss one (especially the upload dialog or the
animation-complete table) and end up with silent inconsistency.

## Inputs to gather

If the user hasn't said:

- **Weapon id** — lowercase, snake_case (`'spear'`, `'bow'`, `'rocket'`).
- **Label** — title-cased for the UI button (`'Spear'`).
- **Base for animations** — which existing weapon's animations to clone from
  (`'rifle'` for two-handed long guns, `'sword'` for melee, `'rocket'` for
  shoulder-fired heavy weapons). Default: `'rifle'`.
- **Has fire/attack animation?** — most do; named `<id>_fire` or `<id>_<verb>`.
  Default to mirroring the base's fire/slash animation.

Note: **do not** ask about or set z-order flags. The renderer uses one
universal order for every weapon. Described from the character's perspective:

`legs → left arm → body → head → weapon → right arm → head_prop`

So the weapon always sits between the head and the trigger (character's right)
arm; the support (character's left) arm always hides behind the body.

> The bone names in code are *mirrored* relative to the character: the bone
> `right_arm` is the character's LEFT arm (support), and `left_arm` is the
> character's RIGHT arm (trigger). The renderer's code order is therefore:
> `left_leg → right_leg → right_arm → body → head → weapon → left_arm → head_prop`.
> Always discuss z-order in character-perspective terms with users.

See CLAUDE.md "Z-draw order" for the full rationale.

## Files to update (in order)

### 1. `src/data/characterParts.js`

Add an entry under `CHARACTER_PARTS.weapon.options`:

```js
<id>: {
  label: '<Label>',
  draw(ctx) {
    // bone +Y = forward (muzzle), -Y = backward (stock/butt),
    // +X = top of weapon, -X = where the grip hangs.
    // Hand grips at the bone origin (0, 0).
    // …
  },
},
```

No z-flags. The renderer's universal order puts every weapon between head
and the trigger arm automatically.

For the procedural draw, use the existing `rifle`/`sword`/`rocket` options as
references for orientation conventions. Keep it recognizable as the weapon
type. If the user hasn't given specific dimensions, use ~60-unit total length
for melee, ~80 for guns, ~110 for shoulder-fired heavy weapons.

### 2. `src/systems/AnimationSystem.js`

Clone the base weapon's animations under new names `<id>_idle`,
`<id>_walk`, plus any fire/attack/jump variants. Keep the same keyframe
structure; tweak only the arm/forearm rotations if the new weapon has a
distinctly different grip geometry. Reference values:

- Rifle stance: `right_arm 1.35`, `right_forearm -1.50`, `left_arm -2.20`, `left_forearm 0.10`
- Sword stance: `right_arm 0.70`, `right_forearm -0.55`, `left_arm -1.52`, `left_forearm -0.12`
- Rocket stance: `right_arm 1.15`, `right_forearm -1.45`, `left_arm -2.05`, `left_forearm -0.20`

Then register in the two maps at the bottom of the file:

```js
export const WEAPON_ANIMATION_SETS = {
  // …
  <id>: ['<id>_idle', '<id>_walk', '<id>_<verb>', '<id>_jump'],
};

export const WEAPON_DEFAULT_ANIMATIONS = {
  // …
  <id>: '<id>_idle',
};
```

### 3. `src/components/WeaponUploadDialog.jsx`

Add a silhouette component + branches:

```js
{weaponType === '<id>' && <CustomSilhouette />}
```

Update the `!['rifle', 'rocket', '<id>'].includes(weaponType)` fallback so
the sword silhouette isn't drawn for the new weapon. Update the body-text
ternaries that pick `'rifle' | 'rocket' | weapon` and `'muzzle' | 'tip'` /
`'stock' | 'handle'` / `'back-blast' | 'handle'` — choose terms that fit
the new weapon (e.g. spear → "tip" / "butt").

### 4. `src/App.jsx`

If any of the new animations are **one-shot** (`loop: false`), add entries
to `ANIMATION_COMPLETE_TARGETS` so each lands on the weapon's idle:

```js
const ANIMATION_COMPLETE_TARGETS = {
  // …
  <id>_<verb>: '<id>_idle',
  <id>_jump:   '<id>_idle',
};
```

Looping animations don't need an entry, but it's harmless to add one in case
it's flipped later.

### 5. (Optional) `src/data/defaultBuild.js`

If the user wants the new weapon's anchor pre-tuned in new characters, add
entries to `DEFAULT_WEAPON_OFFSETS` and `DEFAULT_WEAPON_ANIM_OFFSETS`. Skip
otherwise — they can tune via the UI and run `bake-defaults` later.

## Verify

After the edits, check the Vite dev-server log for HMR success. The new
weapon button should appear in the right panel's Weapon row automatically
(the UI iterates `CHARACTER_PARTS.weapon.options`).

## Gotchas

- The `<id>` is used as both the part-options key, the prefix for animations,
  and the key in `WEAPON_ANIMATION_SETS` / `WEAPON_DEFAULT_ANIMATIONS` /
  `ANIMATION_COMPLETE_TARGETS`. Use it consistently — no underscores in the
  weapon id itself, only in animation names (`spear_idle`, not `spear_t_idle`).

- No per-weapon z-order flags exist. The renderer (`src/systems/Renderer.js`)
  uses one fixed order. Character-perspective:
  `legs → left arm → body → head → weapon → right arm → head_prop`.
  Code-perspective (mirrored bone names):
  `left_leg → right_leg → right_arm → body → head → weapon → left_arm → head_prop`.
  If a weapon "looks behind" something, the fix is the pose, not the order.

- The fire/attack animation conventionally uses `_fire` for ranged
  (`rifle`, `rocket_fire`, `full_auto`) and `_slash` / `_thrust` / etc.
  for melee. The animation key doesn't have to follow that, but the
  UI button label comes from the animation's `name:` field — make it
  short ("Fire", "Slash", "Throw").

- Don't forget to register the new weapon in `WEAPON_DEFAULT_ANIMATIONS` —
  without it, switching to the new weapon falls through to `'idle'` which
  is the no-weapon animation and looks wrong.
