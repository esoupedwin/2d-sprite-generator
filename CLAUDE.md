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

`mergeOffsets` is defined locally in both `CharacterCanvas.jsx` and `export.js` — keep them in sync if you change the merge logic.

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

## Skin template format

```js
[boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy]
//         ↑ anchor in bone-local space
//                     ↑ Bézier handle offsets FROM anchor, also bone-local
```

`drawSkin(ctx, template, worldTransforms, color, scale=1)` — scale multiplies all local coords (lx, ly, handles) before rotating into world space. Scales around the bone joint.

## Z-draw order (Renderer.js)

```
right_arm → weapon → left_leg → right_leg → lower_torso → body
  → [left_arm if NOT carry_walk]
  → head → head extras
  → [left_arm if carry_walk]   ← only animation that reorders z
  → head_prop
```

`leftArmOverHead = animation === 'carry_walk'` — the only animation-specific z-override.

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

If the animation needs special z-ordering (like `carry_walk`), add a guard in `Renderer.js → renderCharacter`.

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

- **mergeOffsets duplication**: both `CharacterCanvas.jsx` and `export.js` define it locally — if you change merge logic, update both.
- **worldToLocal** in `VectorEditor.js` is inverse rotation only (no translation factor) — it assumes the input `wx, wy` is already character-local (not screen-space).
- Skin point handles are bone-local offsets FROM the anchor, not from the bone origin.
- `DRAW_ORDER` in `characterParts.js` is legacy/unused — Renderer.js controls draw order directly.
- When adding a new animation with `loop: false`, add it to the `if (animName === 'attack' || ...)` guard in `App.jsx → handleAnimationComplete` to return to idle.
