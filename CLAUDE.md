# CLAUDE.md — 2D Sprite Generator

## Stack
React 18 + Vite 5, HTML5 Canvas 2D, no external rendering libraries.  
Dev server: `npm run dev` → `http://localhost:4001`  
No TypeScript. JSX only. No test suite.

## File map

```
src/
  systems/
    SkeletonSystem.js    — BONES hierarchy, computeWorldTransforms(pose)
    AnimationSystem.js   — ANIMATIONS object, getPoseAtTime(anim, t)
    SkinSystem.js        — drawSkin(), skin template constants (HEAD_SKIN etc.)
    Renderer.js          — renderCharacter() — orchestrates draw order + z-layering
    VectorEditor.js      — overlay rendering, hit-testing, addSkinPoint, updateSkinPoint
  data/
    characterParts.js    — CHARACTER_PARTS, DEFAULT_CHARACTER, draw() for props/weapons
  components/
    CharacterCanvas.jsx  — RAF loop, mouse drag, zoom/pan, undo history
    CharacterBuilder.jsx — Left sidebar: part colors, size scaling
    AnimationControls.jsx— Right sidebar: animation selector, export buttons
  utils/
    transforms.js        — mergeOffsets() shared by CharacterCanvas and export
    export.js            — exportSpriteSheet(), exportAnimationJSON()
  App.jsx                — State owner: characters[], activeCharId, callbacks
  App.css
```

## Render pipeline (every frame)

```
getPoseAtTime(anim, time)           → animPose   {boneId: {x,y,rotation}}
mergeOffsets(animPose, boneOffsets) → fullPose   (adds character customisation)
computeWorldTransforms(fullPose)    → worldTransforms  {boneId: {x,y,rotation}}
renderCharacter(ctx, character, worldTransforms, options)
```

`mergeOffsets` lives in `src/utils/transforms.js` and is imported by both `CharacterCanvas.jsx` and `export.js`.

## Skeleton (SkeletonSystem.js)

15 bones. Parent→child chain, children inherit rotations.

```
torso
  ├─ head           (localY = -65)
  ├─ lower_torso    (localY = +50)
  │    ├─ left_leg  → left_shin  → left_foot
  │    └─ right_leg → right_shin → right_foot
  ├─ left_arm  → left_forearm  → left_hand
  └─ right_arm → right_forearm → right_hand
```

`worldTransforms[boneId] = { x, y, rotation }` — character-local space with `torso` at origin ~(0, 0). The canvas applies `translate(originX, originY); scale(BASE_SCALE * zoom, ...)` on top.

All rotations in **radians**. Positive = clockwise (canvas coords). Y increases downward.

**Facing convention:** the character always faces **+X (right)**. Any directional animation — punch, attack, walk push-off, weapon swing, etc. — should be oriented toward +X. A "forward" punch sends the fist to the right side of the canvas.

## Skin template format

```js
[boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy]
//         ↑ anchor in bone-local space
//                     ↑ Bézier handle offsets FROM anchor, also bone-local
```

`drawSkin(ctx, template, worldTransforms, color, scale=1)` — scale multiplies all local coords (lx, ly, handles) before rotating into world space. Scales around the bone joint.

## Z-draw order (Renderer.js)

Universal order, back → front. **No per-weapon or per-animation z flags.**

Described from the **character's** perspective:

```
legs → LEFT arm → body → head (+ extras) → weapon → RIGHT arm → head_prop
```

> **Bone-name caveat:** the bones in `SkeletonSystem.js` are named *opposite* to the character's body — the bone called `right_arm` is on the **character's LEFT side** (support / non-dominant), and the bone called `left_arm` is on the **character's RIGHT side** (trigger / dominant). The renderer's source comments map this explicitly. When discussing z-order with users, always use the character's perspective. When editing bone data, remember the bone names are mirrored.
>
> Code order in `renderCharacter()` therefore is:
> `left_leg → right_leg → right_arm → body → head → weapon → left_arm → head_prop`.

Rationale:
- **Character's left arm behind body** — the support / far-side arm wraps around the body silhouette only where it extends past.
- **Weapon between head and character's right arm** — the trigger/dominant hand always grips it from the front; the weapon always passes in front of the head/cheek (matters for shouldered weapons like rifle / rocket / grenade_launcher).
- **head_prop on top of everything** — hats/crates ride above weapon and arms.

This applies to every weapon (sword, rifle, bow, rocket, grenade_launcher, future additions). Do **not** add `aboveHead`, `rightArmInFront`, `leftArmBehind` flags or animation-specific z-overrides — the canonical order handles all cases.

## Character data model (App.jsx state)

```js
{
  id, name,
  parts: {
    head, body, lower_torso, left_arm, right_arm,
    left_leg, right_leg, head_prop, weapon,   // option keys
    customColors:  { [partKey]: '#hex' },      // overrides preset color
    partScales:    { [partKey]: 1.5 },         // size multiplier (default 1)
  },
  boneOffsets:          { [boneId]: {x?, y?, rotation?} },  // drag-adjusted pose
  skinOverrides:        { [skinKey]: [[...], ...] },         // edited skin templates
  defaultBoneOffsets:   { ... },   // saved checkpoint
  defaultSkinOverrides: { ... },
}
```

`character.parts` is passed directly to `renderCharacter` as the `character` arg. So `getColor(character, partKey)` reads `character.customColors`, `getScale(character, partKey)` reads `character.partScales`.

## Adding a new animation

In `AnimationSystem.js`, add a key to `ANIMATIONS`:

```js
my_anim: {
  name: 'Display Name',
  duration: 0.80,   // seconds
  loop: true,       // false → fires onAnimationComplete at end
  tracks: {
    torso:      [{ time: 0, rotation: 0 }, ...],
    left_arm:   [...],
    // only bones that move need tracks; unspecified bones hold their rest pose
  },
}
```

Then add the button in `AnimationControls.jsx` and handle completion in `App.jsx → handleAnimationComplete` if `loop: false`.

Do NOT add per-animation z-overrides in `Renderer.js` — the universal draw order is intentional. If a pose looks wrong, fix the pose, not the order.

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

## Export (utils/export.js)

`exportSpriteSheet(character, animationName, boneOffsets, skinOverrides, frameCount=12)`

Mirrors the canvas draw loop exactly:
```js
getPoseAtTime → mergeOffsets → computeWorldTransforms → renderCharacter
```

Called from `App.jsx` passing `activeChar.parts`, `activeChar.boneOffsets`, `activeChar.skinOverrides`.

## Canvas interaction (CharacterCanvas.jsx)

- **stateRef pattern**: mutable state the RAF loop reads without triggering re-renders. All frequently-read values (animation, boneOffsets, etc.) are mirrored into `stateRef.current` on every render.
- **dragRef**: `{ type:'bone'|'anchor'|'handleIn'|'handleOut', boneId?, skinKey?, pointIndex? }`
- **panDragRef**: middle-mouse pan
- Undo history in `historyRef` (session only, capped at 60). `pushHistory()` before any bone/skin mutation.
- Canvas size: 620×640 px. Origin at (310, 490). `BASE_SCALE = 2.5`.

## Persistence

Characters saved to `localStorage` (`2dsprite:characters`) and to `characters.json` via `/api/characters` (Vite plugin in `vite.config.js`). File wins on load. `character-defaults.json` holds the default pose checkpoint via `/api/defaults`.

## Common pitfalls

- **worldToLocal** in `VectorEditor.js` is inverse rotation only (no translation factor) — it assumes the input `wx, wy` is already character-local (not screen-space).
- Skin point handles are bone-local offsets FROM the anchor, not from the bone origin.
- `DRAW_ORDER` in `characterParts.js` is legacy/unused — Renderer.js controls draw order directly.
- When adding a new animation with `loop: false`, add it to the `if (animName === 'attack' || ...)` guard in `App.jsx → handleAnimationComplete` to return to idle.
