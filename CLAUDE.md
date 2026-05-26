# CLAUDE.md — 2D Sprite Generator

## Stack
React 18 + Vite 5, HTML5 Canvas 2D, no external rendering libraries.  
Dev server: `npm run dev` → `http://localhost:4000` (port may vary; check terminal output)  
No TypeScript. JSX only. No test suite.

## File map

```
src/
  systems/
    SkeletonSystem.js     — BONES hierarchy, computeWorldTransforms(pose)
    AnimationSystem.js    — ANIMATIONS, getPoseAtTime(), resolveAnimation(), WEAPON_ANIMATION_SETS
    SkinSystem.js         — drawSkin(), skin template constants (HEAD_SKIN etc.)
    Renderer.js           — renderCharacter(), MELEE_WEAPONS — draw order + z-layering
    VectorEditor.js       — overlay rendering, hit-testing, addSkinPoint, updateSkinPoint
    IKSystem.js           — inverse kinematics helpers
  data/
    characterParts.js     — CHARACTER_PARTS, DEFAULT_CHARACTER, draw() for props/weapons
    defaultBuild.js       — DEFAULT_WEAPON_OFFSETS, DEFAULT_ANIM_BONE_OFFSETS, etc.
  components/
    CharacterCanvas.jsx   — RAF loop, mouse drag, zoom/pan, undo history
    CharacterBuilder.jsx  — Left sidebar: part colors, size scaling
    AnimationControls.jsx — Right sidebar: TYPES + ACTIONS panels
    AnimationCurvePanel.jsx — Per-animation keyframe table, Commit/Save-as-template buttons
    EditBodyControls.jsx  — Body offset editing UI
    PoseEditor.jsx        — Frame-by-frame pose editor
    NewAnimationDialog.jsx — Dialog: blank or from template when creating a new animation
    SaveTemplateDialog.jsx — Reusable name-input dialog (templates + weapon naming)
    ExportMenu.jsx        — Export controls
    SpriteExportDialog.jsx / SpritePreviewDialog.jsx — Export flow
    WeaponUploadDialog.jsx — PNG upload for weapon skin
    AccessoryUploadDialog.jsx — PNG upload for right-arm accessory (per weapon type)
    CharacterManagerDialog.jsx / WorkspaceMenu.jsx
  utils/
    transforms.js         — mergeOffsets() shared by CharacterCanvas and export
    export.js             — exportSpriteSheet(), exportAnimationJSON()
    weaponSettings.js     — resolveWeaponOffset/Scale/AccessoryOffset/Scale (fallback chains)
    poseToAnimation.js    — framesToAnimation() — converts recorded frames to animation data
    genId.js              — genId() — generates unique IDs
    mathUtils.js          — shared math helpers
    spriteExportConfig.js — export configuration constants
  App.jsx                 — State owner: characters[], activeCharId, all callbacks
  App.css
```

## Render pipeline (every frame)

```
resolveAnimation(baseAnim, overrides)              → mergedAnim  (applies per-char keyframe deltas)
getPoseAtTime(mergedAnim, time)                    → animPose    {boneId: {x,y,rotation}}
mergeOffsets(animPose, animBoneOffsets[animId])    → fullPose    (adds time-invariant pose offsets)
computeWorldTransforms(fullPose)                   → worldTransforms  {boneId: {x,y,rotation}}
renderCharacter(ctx, character, worldTransforms, options)
```

`mergeOffsets` lives in `src/utils/transforms.js` and is imported by both `CharacterCanvas.jsx` and `export.js`.

The animation lookup always prefers per-character custom animations over built-ins:
```js
character.customAnimations?.find(a => a.id === currentAnimation) ?? ANIMATIONS[currentAnimation]
```
This pattern is used in `CharacterCanvas.jsx` (RAF loop), `export.js`, and `App.jsx`.

## Skeleton (SkeletonSystem.js)

15 bones. Parent→child chain, children inherit rotations.

```
torso
  ├─ head           (localY = -65)
  ├─ lower_torso    (localY = +50)
  │    ├─ left_leg  → left_shin  → left_foot
  │    └─ right_leg → right_shin → right_foot
  ├─ left_arm  → left_forearm  → left_hand   (joint 6 = dominant/right hand)
  └─ right_arm → right_forearm → right_hand  (joint 9 = support/left hand)
```

`worldTransforms[boneId] = { x, y, rotation }` — character-local space with `torso` at origin ~(0, 0). The canvas applies `translate(originX, originY); scale(BASE_SCALE * zoom, ...)` on top.

All rotations in **radians**. Positive = clockwise (canvas coords). Y increases downward.

**Facing convention:** the character always faces **+X (right)**. Any directional animation — punch, attack, walk push-off, weapon swing — should be oriented toward +X.

**Arm bone naming** (inverted — memorise this):
- `left_arm` / `left_forearm` / `left_hand` (joint 6) = character's **RIGHT** (dominant/trigger) arm
- `right_arm` / `right_forearm` / `right_hand` (joint 9) = character's **LEFT** (support) arm

**Approximate idle arm rotations** (useful when authoring new animations):
- `left_arm`: −1.023 rad (hanging forward-right); fully raised (V-pose): ≈ −2.65 rad
- `right_arm`:  +1.022 rad (hanging forward-right, mirrored); fully raised: ≈ +2.65 rad
- `left_forearm`: −0.318 rad; `right_forearm`: −0.558 rad

## Skin template format

```js
[boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy]
//         ↑ anchor in bone-local space
//                     ↑ Bézier handle offsets FROM anchor, also bone-local
```

`drawSkin(ctx, template, worldTransforms, color, scale=1)` — scale multiplies all local coords before rotating into world space. Scales around the bone joint.

## Z-draw order (Renderer.js)

Universal order, back → front. **No per-weapon or per-animation z flags.**

Described from the **character's** perspective:
```
legs → LEFT arm → body → head (+ extras) → weapon → RIGHT arm → head_prop → accessory
```

> **Bone-name caveat:** `right_arm` is on the character's LEFT side (support), `left_arm` is on the RIGHT side (dominant/trigger). Code order in `renderCharacter()` is: `left_leg → right_leg → right_arm → body → head → weapon → left_arm → head_prop → accessory`.

**Melee vs ranged z-split:** melee weapons (sword) draw **behind the head**; ranged weapons draw **in front**. `MELEE_WEAPONS` is exported from `Renderer.js`. Always compute `isMelee` as:
```js
const isMelee = MELEE_WEAPONS.has(weapon) ||
  (customWeapons ?? []).some(w => w.key === weapon && MELEE_WEAPONS.has(w.template));
```
Then pass `isMelee` explicitly to `renderCharacter` — do not rely on the internal fallback, which cannot resolve custom weapon templates.

Do **not** add `aboveHead`, `rightArmInFront`, or animation-specific z-overrides. The canonical order handles all weapons. If a pose looks wrong, fix the keyframes.

## Character data model (App.jsx state)

```js
{
  id, name,
  parts: {
    head, body, lower_torso, left_arm, right_arm,
    left_leg, right_leg, head_prop, weapon,    // option keys
    customColors:     { [partKey]: '#hex' },   // overrides preset color
    partScales:       { [partKey]: 1.5 },      // legacy size multiplier
    weaponImages:     { [weaponKey]: dataUrl },// per-weapon uploaded PNG
    weaponScales:     { [weaponKey]: 1.0 },   // per-weapon size multiplier
    weaponOffsets:    { [weaponKey]: {x,y,rotation} },           // per-weapon default anchor
    weaponAnimOffsets:{ [weaponKey]: { [animId]: {x,y,rotation} } }, // per-(weapon×anim) anchor
    accessoryImages:  { [weaponKey]: dataUrl },// right-arm accessory PNG, per weapon type
    accessoryScales:  { [weaponKey]: 1.0 },   // right-arm accessory size, per weapon type
    accessoryOffset:  { x, y, rotation },     // default accessory anchor (legacy single offset)
    accessoryAnimOffsets: { [animId]: {x,y,rotation} }, // per-animation accessory anchor
  },
  boneOffsets:           { [boneId]: {x?,y?,rotation?} },  // drag-adjusted global pose
  skinOverrides:         { [skinKey]: [[...], ...] },       // edited skin templates
  animBoneOffsets:       { [animId]: { [boneId]: {x?,y?,rotation?} } }, // per-anim pose offset layer
  animKeyframeOverrides: { [animId]: { [boneId]: { [timeKey]: {x?,y?,rotation?} } } }, // ragdoll edits
  customAnimations:      [{ id, name, duration, loop, tracks }], // per-character animation library
  customWeapons:         [{ key: 'cw_<id>', label: 'Staff', template: 'none' }], // per-character
  defaultBoneOffsets:    { ... },   // saved checkpoint
  defaultSkinOverrides:  { ... },
}
```

> **`customWeapons` is per-character** (stored inside the character object, not global state). Each entry carries a `template` field that names the built-in weapon whose animation set and melee z-order rules it inherits. `template: 'none'` → generic set; `template: 'sword'` → melee z-order + sword animations.

Always read weapon/accessory offsets and scales through the helpers in `weaponSettings.js`:
- `resolveWeaponOffset(parts, animId)` / `resolveWeaponScale(parts)`
- `resolveAccessoryOffset(parts, animId)` / `resolveAccessoryScale(parts)`

Never access `parts.weaponAnimOffsets` or `parts.accessoryAnimOffsets` directly.

## Right-arm accessory system

The accessory is a user-uploaded PNG attached to **joint 6** (`left_hand` bone — the character's right/dominant hand). It has the highest z-order (drawn last, on top of everything).

- **Per weapon type**: `parts.accessoryImages[weaponKey]` — switching weapon type changes both weapon PNG and accessory PNG independently.
- **Anchor editing**: purple handles rendered in Edit Animation mode (position: `#A855F7`, rotation: `#C084FC`). Drag types: `accessory-pos` and `accessory-rot`.
- **Offset fallback chain**: `parts.accessoryAnimOffsets[animId]` → `parts.accessoryOffset` → `{x:0,y:0,rotation:0}`.
- **Scale**: `parts.accessoryScales[weaponKey]` — independent per weapon type.
- The accessory PNG is drawn **centered** on its anchor point (`drawImage` at `−w/2, −h/2`). Upload a PNG with the item centered; reposition via the anchor handle. Longest side scales to 80 canvas units before `accessoryScales` multiplier.

## Animation layers (how overrides compose)

Three additive layers sit on top of the base animation data:

| Layer | Storage key | Cleared by |
|---|---|---|
| Keyframe deltas (ragdoll edits) | `animKeyframeOverrides[animId][boneId][timeKey]` | "Commit edits" |
| Time-invariant pose offset | `animBoneOffsets[animId][boneId]` | "Commit edits" / Reset |
| Weapon anchor | `parts.weaponAnimOffsets[weapon][animId]` | Weapon offset reset |

**Commit edits** (`commitAnimKeyframeOverrides` in App.jsx) bakes all three layers into `customAnimations` using `bakeAnimation()`. The baked entry uses the **same `id`** as the source animation — custom-first lookup in the render pipeline picks it up automatically, so no new chip appears in the UI.

`bakeAnimation(baseAnim, overrides, animOffsets)` is a module-level helper in `App.jsx`:
1. Calls `resolveAnimation(baseAnim, overrides)` to merge keyframe deltas into tracks.
2. Adds `animBoneOffsets` as constant tracks (or offsets existing keyframes) for every affected bone.

`resolveAnimation(animation, overrides)` in `AnimationSystem.js` is pure and exported — safe to call anywhere without side effects.

## Custom animations and templates

**Per-character custom animations** (`character.customAnimations[]`) hold animations created or committed by the user. Each entry has the same shape as a built-in `ANIMATIONS` value plus an `id` field.

- If `id` matches a built-in key → shadows the built-in for that character (Commit edits uses this).
- If `id` is a new UUID → appears as a new chip below the separator in the Actions panel (labelled with the character's name).
- `AnimationControls.jsx` filters out baked built-ins (`!ANIMATIONS[a.id]`) so they don't show as duplicates.

**Global animation templates** (`animTemplates` state, `2dsprite:templates` localStorage) are shared across all characters. Saved via "Save as template" in `AnimationCurvePanel.jsx`, default name is `WeaponLabel-AnimName`. Cloned into a character's `customAnimations` via the "+ New" dialog (`NewAnimationDialog.jsx`).

## Custom weapon modes

`customWeapons` is **per-character** (moved from global state). Shape:
```js
[{ key: 'cw_<id>', label: 'Staff', template: 'none' }, ...]
```
- Custom weapon chips appear after the built-ins in the TYPES panel.
- `template` determines: (1) which animation set is shown in ACTIONS, (2) whether the weapon uses melee z-order. Set to a built-in weapon key or `'none'`.
- The visual is a user-uploaded PNG via "Edit Weapon's Skin" — stored in `parts.weaponImages[key]`.
- `AnimationControls.jsx` resolves the animation set via `WEAPON_ANIMATION_SETS[weaponTemplate] ?? WEAPON_ANIMATION_SETS.none`.
- `App.jsx` resolves the default animation on weapon-switch: `WEAPON_DEFAULT_ANIMATIONS[template] ?? 'idle'`.
- Deleting a custom weapon reverts any character using it back to `'none'`.

## Weapon animation sets

`WEAPON_ANIMATION_SETS` in `AnimationSystem.js` maps weapon keys (or templates) to the list of animation IDs available for that weapon.

```js
WEAPON_ANIMATION_SETS = {
  none:             ['idle', 'walk', 'run', 'scared_run', 'jump', 'punch', 'throw', 'carry_walk', 'cheer'],
  sword:            ['sword_idle', 'sword_walk', 'sword_slash', 'sword_jump'],
  rifle:            ['rifle_idle', 'rifle_walk', 'rifle_run', 'rifle_jump', 'rifle'],
  rocket:           ['rocket_idle', 'rocket_walk', 'rocket_fire', 'rocket_jump'],
  bow:              ['bow_idle', 'bow_walk', 'bow_fire', 'bow_jump'],
  grenade_launcher: ['grenade_launcher_idle', ...],
  pistol:           ['pistol_idle', 'pistol_walk', 'pistol_fire', 'pistol_jump'],
}
```

`WEAPON_DEFAULT_ANIMATIONS` maps each weapon key to the animation that auto-selects when the weapon is switched.

## Adding a new animation

In `AnimationSystem.js`, add a key to `ANIMATIONS`:

```js
my_anim: {
  name: 'Display Name',
  duration: 0.80,   // seconds
  loop: true,       // false → fires onAnimationComplete at end
  tracks: {
    torso:    [{ time: 0, rotation: 0 }, ...],
    left_arm: [...],
    // only bones that move need tracks; unspecified bones hold rest pose
  },
}
```

Then add it to the relevant `WEAPON_ANIMATION_SETS` entry. The button renders automatically — no manual chip needed. If `loop: false`, add it to `ANIMATION_COMPLETE_TARGETS` in `App.jsx` to specify what plays next.

**Reference rotations for cheer/jump-style animations:**
- Crouch: `torso.y ≈ +20`, shins ≈ 0.62 rad
- Apex: `torso.y ≈ −82`, shins ≈ 0.50 rad (tucked), feet ≈ 0.30 rad (pointed)
- Arms fully raised V-pose: `left_arm ≈ −2.65`, `right_arm ≈ +2.65`; forearms ≈ −0.10

## Adding a new body part

1. Add an entry to `CHARACTER_PARTS` in `characterParts.js`:
   - `boneId` — which bone it attaches to
   - `options` with `{ label, color? }` for skin parts, or `{ label, draw(ctx) }` for props
   - `draw(ctx)` is called with ctx already translated+rotated to the bone; draw in bone-local space
2. Add the default option key to `DEFAULT_CHARACTER`
3. Parts with `draw()` are rendered by `drawPart()` in Renderer.js; skin-based parts use `drawSkin()`
4. Shape-selector parts (weapon, head_prop): `isShapeSelector = partKey === 'weapon' || partKey === 'head_prop'` in CharacterBuilder.jsx — shows option buttons instead of a color picker

## Adding a new skin (skin-based part)

1. Define `MY_SKIN` constant in `SkinSystem.js` with point format above
2. Export it and add it to `DEFAULT_SKINS` in `VectorEditor.js`
3. Add a `SKIN_COLORS` entry in `VectorEditor.js` (anchor/handle/stem/label)
4. Call `drawSkin(ctx, skins.my_skin || MY_SKIN, worldTransforms, getColor(...), getScale(...))` in `Renderer.js → renderCharacter` at the right z position
5. Pass the skin through in `CharacterCanvas.jsx` (already auto-included via `DEFAULT_SKINS` loop)

## Vector editor (VectorEditor.js)

- **Ctrl+click** on canvas when vector overlay is on + a specific skin is selected → adds a point via `addSkinPoint()`
- **Drag** anchor or handle → `updateSkinPoint()`
- `renderVectorOverlay()` returns `hitTargets` in character-local space; hit radius is `VECTOR_HIT_PX = 10` canvas pixels (in `CharacterCanvas.jsx`)
- `visualScale = 1 / zoom` keeps anchor/handle screen size constant at any zoom
- **worldToLocal** is inverse rotation only (no translation) — input must already be character-local, not screen-space.

## Export (utils/export.js)

`exportSpriteSheet(character, animationName, boneOffsets, skinOverrides, frameCount=12)`

Mirrors the canvas draw loop exactly — uses the same custom-first animation lookup:
```js
character.customAnimations?.find(a => a.id === animationName) ?? ANIMATIONS[animationName]
```

Then: `resolveAnimation → getPoseAtTime → mergeOffsets → computeWorldTransforms → renderCharacter`

`loadRenderAssets` preloads `weaponImage` from `parts.weaponImages[parts.weapon]` and `accessoryImage` from `parts.accessoryImages[parts.weapon]`. Both are passed into `renderCharacter`. `isMelee` is also resolved (with template fallback) and passed explicitly.

## Canvas interaction (CharacterCanvas.jsx)

- **stateRef pattern**: mutable state the RAF loop reads without triggering re-renders. All frequently-read values (animation, boneOffsets, accessoryOffset, customWeapons, etc.) are mirrored into `stateRef.current` on every render.
- **dragRef**: `{ type:'bone'|'anchor'|'handleIn'|'handleOut'|'weapon-pos'|'weapon-rot'|'accessory-pos'|'accessory-rot', ... }`
- **panDragRef**: middle-mouse pan
- Undo history in `historyRef` (session only, capped at 60). `pushHistory()` before any bone/skin mutation.
- Canvas size: 620×640 px. Origin at (310, 490). `BASE_SCALE = 2.5`. Background: `#FFE699`.

**Accessory anchor handles** (shown when `editAnimPose && accessoryImageRef.current`):
- Position handle: purple circle `#A855F7` at `left_hand` + current accessory offset
- Rotation handle: lighter purple `#C084FC` circle offset 22 units from position handle
- Drag `accessory-pos` → calls `onAccessoryOffsetSet({ x, y, rotation })` via stateRef

## Reusable dialog shell (SaveTemplateDialog.jsx)

Generic name-input dialog used for both animation template naming and custom weapon create/rename:
```js
<SaveTemplateDialog
  open={bool}
  defaultName="..."
  title="New Weapon Mode"      // defaults to 'Save as Template'
  inputLabel="Weapon name"     // defaults to 'Template name'
  onClose={fn}
  onSave={fn}
/>
```
Auto-selects text on open. Enter key confirms. Save disabled when input is empty.

## Persistence

| Data | Storage |
|---|---|
| Characters (incl. `customWeapons`) | `localStorage` (`2dsprite:characters`) + `characters.json` via `/api/characters` Vite plugin. File wins on load. |
| Default build | `character-defaults.json` via `/api/defaults` |
| Animation templates | `localStorage` (`2dsprite:templates`) only — global, shared across characters |

> **`customWeapons` is no longer in global storage** — it moved into each character object so different characters can have different weapon types.

## Common pitfalls

- **Custom-first lookup**: always use `customAnimations?.find(a => a.id === key) ?? ANIMATIONS[key]` — never read `ANIMATIONS[key]` directly in the render path.
- **Same-ID shadowing**: "Commit edits" stores the baked animation with the original built-in ID. The baked entry does NOT appear as a new chip — `AnimationControls` filters it out via `!ANIMATIONS[a.id]`.
- **timeKey precision**: keyframe override keys are `time.toFixed(2)` strings (e.g. `"0.35"`). Use `keyframeTimeKey(time)` from `AnimationSystem.js` for consistent formatting.
- **worldToLocal** in `VectorEditor.js` is inverse rotation only — assumes input is already character-local.
- Skin point handles are bone-local offsets FROM the anchor, not from the bone origin.
- `DRAW_ORDER` in `characterParts.js` is legacy/unused — `Renderer.js` controls draw order directly.
- **isMelee for custom weapons**: `MELEE_WEAPONS.has(weapon)` alone is wrong for `cw_…` keys. Always check `w.template` too: `MELEE_WEAPONS.has(w.template)`. Pass the resolved `isMelee` to `renderCharacter` — never rely on the internal fallback.
- **Accessory vs weapon keying**: both are keyed by `parts.weapon` (the weapon type key, e.g. `'sword'` or `'cw_abc'`), not by animation ID. Switching the weapon type changes both sets.
- Weapon/accessory offset + scale: always read through `resolveWeaponOffset/Scale` and `resolveAccessoryOffset/Scale` in `weaponSettings.js`.
