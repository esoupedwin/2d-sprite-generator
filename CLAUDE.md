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
    defaultAnimTemplates.js — DEFAULT_ANIM_TEMPLATES: built-in "+ New" templates (bone motion only)
  components/
    CharacterCanvas.jsx   — RAF loop, mouse drag, zoom/pan, undo history
    CharacterBuilder.jsx  — Left sidebar: part colors, size scaling
    AnimationControls.jsx — Right sidebar: ACTIONS panel (animation chips for the character's one weapon type)
    AnimationCurvePanel.jsx — Per-animation keyframe table, Commit/Save-as-template buttons
    EditBodyControls.jsx  — Body offset editing UI
    PoseEditor.jsx        — Frame-by-frame pose editor
    NewAnimationDialog.jsx — Dialog: blank or from template when creating a new animation
    SaveTemplateDialog.jsx — Reusable name-input dialog (templates + weapon naming)
    ExportMenu.jsx        — Export controls
    BatchExportDialog.jsx — "All Actions → Folder": frames (default 32) + output folder, writes via /api/export-sprites
    FolderExportDialog.jsx — "Export Folder": pick a character folder (or "No folder"), same options; runs the batch export per character
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
[boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy, weight?]
//         ↑ anchor in bone-local space
//                     ↑ Bézier handle offsets FROM anchor, also bone-local
//                                                  ↑ optional parent/child blend (default 1)
```

`drawSkin(ctx, template, worldTransforms, color, scale=1)` — scale multiplies all local coords before rotating into world space. Scales around the bone joint.

**Blended joint points (`weight`):** `skinPointFrame(pt, worldTransforms)` in `SkinSystem.js` returns the frame a point's local coords live in. Weight 1 (or absent) → the bone's own transform. Weight `w < 1` → origin stays on the bone's joint but rotation = `parent.rotation + w·(bone.rotation − parent.rotation)`, so a 0.5 point sits on the joint's bisector however hard the limb flexes — this is what stops elbows/knees/wrists/ankles pinching or folding over. The default arm/leg templates mark their 8 joint points 0.5. **Every** world↔local conversion of a skin point (render, overlay, hit-test, drag, add, rebind) must go through `skinPointFrame` — never `worldTransforms[boneId]` directly. Root bones ignore weight. In the vector editor, **Shift+click** an anchor toggles rigid ↔ 0.5 (`toggleSkinPointBlend` re-expresses the point so it doesn't move in the current pose); blended anchors draw as diamonds. The 8th element is only written when `< 1`, so older 7-element saved overrides are untouched.

## Z-draw order (Renderer.js)

`renderCharacter()` draws the body in **layers**, back → front. Each layer is an
entry in a `layerDraw` map keyed by part; the loop draws them in the resolved
order. The **head is always on top** of the other body parts (body, arms, legs,
weapon); the head prop rides with the head, the **body (back) accessory always
draws first** (behind every body part, before the layer loop), and the **hand
accessory always draws last** (on top). Neither accessory is reorderable.

Default order, back → front (code keys; `right_arm` = character's LEFT/support
arm, `left_arm` = RIGHT/dominant arm):
```
armed:   left_leg → right_leg → right_arm → body → weapon → left_arm → head
unarmed: right_arm → left_leg → right_leg → body → weapon → left_arm → head
```
`defaultLayerOrder(weapon)` returns this (unarmed tucks the support arm behind
the legs). `ORDERABLE_LAYERS` lists the reorderable layers with labels.

**Per-animation z-order override:** `renderCharacter` accepts a `partZOrder`
option — a back → front array of layer keys (see `ORDERABLE_LAYERS`). It's stored
per animation on the character as `animPartZOrder[animId]` and edited via the
Layer Order panel in Edit Animation. `resolveLayerOrder()` keeps the override's
ordering but appends any missing layers so nothing disappears. `null`/absent →
the weapon-based default above. The live canvas and every export path thread
`partZOrder` through.

**Melee weapons:** `MELEE_WEAPONS` is still exported from `Renderer.js` (used by
callers for filenames/logic), but weapon z-order no longer branches on it — the
head sits on top regardless, so `isMelee` no longer affects the draw order.

The split export uses `partsFilter` ({ legs, head, others } group flags); the
layer loop respects it via `includeFor(key)`, so split + custom z-order compose.

**Per-animation weapon visibility:** `renderCharacter` also takes `hideWeapon`
(skips the `weapon` layer). Stored on the character as `animWeaponHidden[animId]
= true`, toggled with the eye button on the Weapon row of the Layer Order panel
(Edit Animation). It reaches every renderer through `resolveRenderOptions` (see
the helper list above); the parts-sheet export omits the weapon sheet, and the
weapon anchor/rotation handles are not drawn while hidden.

## Character data model (App.jsx state)

```js
{
  id, name,                 // workspace label shown in the Characters selector/manager
  displayName?,             // the character's own name (Name field under CHARACTERS); optional, separate from `name`
  folder?,                  // folder NAME this character sits in (one level); absent = root
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
  animPartZOrder:        { [animId]: ['left_leg', ...] },  // per-anim layer order override (back → front)
  animWeaponHidden:      { [animId]: true },               // per-anim "don't draw the weapon" (only true entries stored)
  customAnimations:      [{ id, name, duration, loop, tracks }], // per-character animation library
  hiddenAnimations:      ['punch', ...],   // built-in anim IDs hidden from ACTIONS for this character (delete = hide; restorable)
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

**Weapon type** is resolved through `weaponSettings.js` too — never inline the `customWeapons.find(...)?.template` lookup:
- `resolveWeaponTemplate(character)` → the built-in key driving the animation set / melee rules (handles legacy `cw_…` keys)
- `isMeleeWeapon(character)`, `hasWeapon(character)`, `MELEE_WEAPONS`

**Per-character animation selectors** (`AnimationSystem.js`) are the one source of truth for the ACTIONS panel, the delete fallback and the sheet exporter:
- `visibleActions(character)` → `[{ id, label, loop, builtIn }]` in panel order (weapon set minus `hiddenAnimations`, then custom)
- `weaponAnimationSet(character)`, `defaultAnimationFor(character)`, `animationLabel(character, id)`, `hiddenActionCount(character)`
- `animTemplateFields(anim)` → the only fields a template carries (`name, duration, loop, tracks`)

**Render options** — `resolveRenderOptions(character, animId)` in `Renderer.js` returns `{ animation, isMelee, partZOrder, hideWeapon }`. Every `renderCharacter` caller spreads it (live canvas via the `renderOpts` prop, ghosts, sheet/pose/parts exports). Add a new per-animation flag THERE, not at each call site.

**Character object helpers** (`utils/characters.js`): `withOptional(obj, key, value)` (set-or-delete an optional field), `characterLabel(c)`, folder helpers `mergeFolders` / `uniqueFolderName` / `folderOf`, and `normalizeCharacters` which every ingress (localStorage, `characters.json`, workspace file) runs to strip legacy keys and default the arrays. `utils/names.js` has `uniqueName(base, taken, sep)`.

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

**Built-in templates** live in code: `DEFAULT_ANIM_TEMPLATES` in `src/data/defaultAnimTemplates.js` (`builtIn: true`, not deletable, listed first; `allAnimTemplates` in App.jsx = defaults + user templates). A template is **bone motion only** — `{ name, duration, loop, tracks }`. `createAnimFromTemplate` copies exactly those fields into a new `customAnimations` entry (fresh `genId()`, the template's name verbatim); skins, images, `animPartZOrder` and weapon/accessory settings are never carried, so the receiving character keeps its own. To add a built-in, bake a character's animation **through the JS pipeline** (`resolveAnimation` — which also applies `syncLoopFrame`, so a looping animation's end frame mirrors its start — then add `animBoneOffsets`, exactly as `bakeAnimation` does) and paste the tracks. Don't re-implement the bake by hand: a looping animation whose last keyframe isn't a copy of its first will drift from the live render otherwise. `carry` and `throw` were produced this way from the workspace's "Cat - Conscript".

## One weapon type per character (no "Types" UI)

A character has exactly **one** weapon type: `parts.weapon`. There is no UI to switch, add, rename, hide or delete types any more — the TYPES panel, `NewWeaponDialog`, and the `addCustomWeapon` / `renameCustomWeapon` / `removeWeaponType` / `restoreHiddenWeapons` callbacks were removed. The key is set when the character is created (`DEFAULT_CHARACTER.weapon`) or inherited by **Duplicate** in the character manager — duplicate an existing character to get another one of the same type.

The key still drives everything internally, so the data model is unchanged: `weaponImages[key]`, `accessoryImages[key]`, `weaponAnimOffsets[key][animId]`, the ACTIONS animation set and the default animation are all resolved from `parts.weapon` exactly as before.

`customWeapons` is kept **per-character** purely so legacy `cw_<id>` keys still resolve their template:
```js
[{ key: 'cw_<id>', label: 'Staff', template: 'none' }, ...]
```
- `template` determines which animation set is shown in ACTIONS (`WEAPON_ANIMATION_SETS[template] ?? WEAPON_ANIMATION_SETS.none`) and the default animation (`WEAPON_DEFAULT_ANIMATIONS[template] ?? 'idle'`).
- The visual is the uploaded PNG in `parts.weaponImages[key]` ("Customize Weapon & Accessories").
- `hiddenWeapons` (and the old per-animation head images) are stripped by `normalizeCharacters` on load.

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

**All Actions → Folder** (`exportAllActionSheets` in `export.js`, `BatchExportDialog.jsx`): for every action in `listExportableActions(character)` (weapon set minus `hiddenAnimations`, plus the character's own custom animations) it builds a **body** sheet (`partsFilter {others, head}`) and a **legs** sheet and POSTs each PNG to the Vite endpoint `/api/export-sprites` (`vite.config.js`), which writes `<root>/<folder>/<character>/{body,legs}/<action>.png`. `<folder>` = `character.folder` (omitted if none), `<character>` = `displayName || name`, `<action>` = the chip label — all via `sanitizeFileName`. Each sheet is POSTed as a raw `image/png` body with `X-Export-Root` / `X-Export-Path` headers (URI-encoded); uploads overlap with the next render. GET on the endpoint returns the default output folder (`~/Downloads`). Only works under `npm run dev` (needs the server); the "Single Sprite Sheet" item is the old per-action browser download.

**Export Folder** (`exportCharactersSheets` in `export.js`, `FolderExportDialog.jsx`): same thing for every character in one manager folder (or the un-foldered ones via the "No folder" option), with one aggregated progress counter. Defaults to the active character's folder.

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

## Shared UI pieces

- `SaveTemplateDialog.jsx` — the "Save as template" name prompt (`open`, `defaultName`, `onClose`, `onSave`). Auto-selects text on open; Enter confirms; Save disabled when empty.
- `ConfirmDialog.jsx` — generic confirm (used for action, character and folder deletes).
- `components/ui/rename-input.jsx` — `RenameInput` inline editor (focus+select on mount, Enter/blur commit, Esc cancel). Used by the ACTIONS chips and the character manager rows.
- `lib/useEscapeToClose.js` — `useEscapeToClose(open, onClose, blocked)`; pass `blocked` while a nested confirm or an export owns Escape.
- `SheetExportParts.jsx` — `useSheetExport` + the shell/fields/progress/result/footer shared by the two folder-export dialogs.

## Persistence

| Data | Storage |
|---|---|
| Characters (incl. `customWeapons`) | `localStorage` (`2dsprite:characters`) + `characters.json` via `/api/characters` Vite plugin. File wins on load. |
| Default build | `character-defaults.json` via `/api/defaults` |
| Animation templates | `localStorage` (`2dsprite:templates`) — global, shared across characters |
| Editor settings | `localStorage` (`2dsprite:settings`) — canvas bg, grid |
| **Workspace file** (Save/Load Workspace) | v2 JSON: `{ version, savedAt, activeCharId, uiState, settings, folders, animTemplates, characters }` — the complete state. Loading a v1 file (no templates/settings) keeps the browser's current templates/settings. |
| Character folders | `localStorage` (`2dsprite:folders`) — ordered list of folder names (empty folders included); membership is `character.folder`. Included in the Workspace JSON (`folders`). Readers use `folderList` (App.jsx) = `mergeFolders(folders, characters)`, a memo that appends any name found on a character but missing from the list — there is no sync effect. |

> **`customWeapons` is no longer in global storage** — it moved into each character object so different characters can have different weapon types.

## Common pitfalls

- **Custom-first lookup**: always use `customAnimations?.find(a => a.id === key) ?? ANIMATIONS[key]` — never read `ANIMATIONS[key]` directly in the render path.
- **Same-ID shadowing**: "Commit edits" stores the baked animation with the original built-in ID. The baked entry does NOT appear as a new chip — `AnimationControls` filters it out via `!ANIMATIONS[a.id]`.
- **timeKey precision**: keyframe override keys are `time.toFixed(2)` strings (e.g. `"0.35"`). Use `keyframeTimeKey(time)` from `AnimationSystem.js` for consistent formatting.
- **worldToLocal** in `VectorEditor.js` is inverse rotation only — assumes input is already character-local.
- Skin point handles are bone-local offsets FROM the anchor, not from the bone origin.
- `DRAW_ORDER` in `characterParts.js` is legacy/unused — `Renderer.js` controls draw order directly.
- **Weapon type / melee**: use `resolveWeaponTemplate` / `isMeleeWeapon` from `weaponSettings.js` (they handle legacy `cw_…` keys); render flags come from `resolveRenderOptions`. Never recompute either inline.
- **Accessory vs weapon keying**: both are keyed by `parts.weapon` (the weapon type key, e.g. `'sword'` or `'cw_abc'`), not by animation ID. Switching the weapon type changes both sets.
- Weapon/accessory offset + scale: always read through `resolveWeaponOffset/Scale` and `resolveAccessoryOffset/Scale` in `weaponSettings.js`.
