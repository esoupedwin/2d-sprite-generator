# Tech Stack & Implementation Details — 2D Sprite Generator

## Core stack

| Layer | Technology | Version |
|---|---|---|
| UI framework | React | 18.3 |
| Build tool | Vite | 5.4 |
| Styling | Tailwind CSS | 3.4 |
| Component primitives | Radix UI | various |
| Component library | shadcn/ui | (owned source) |
| Icons | lucide-react | 1.14 |
| Canvas rendering | HTML5 Canvas 2D API | native |
| Language | JavaScript (JSX) | ES modules |

No TypeScript. No test suite. No external rendering library — all sprite drawing is plain canvas 2D.

---

## Styling system

### Tailwind CSS
Utility-first CSS applied directly in JSX classnames. Config at [tailwind.config.js](tailwind.config.js).

All design tokens (colors, radius, spacing) are defined as CSS custom properties in [src/index.css](src/index.css) and mapped into Tailwind's theme via `hsl(var(--token))`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary:    240 5.9% 10%;
  --card:       0 0% 100%;
  --muted:      240 4.8% 95.9%;
  --border:     240 5.9% 90%;
  --radius:     0.5rem;
  /* etc. */
}
.dark {
  /* same tokens, dark values */
}
```

Dark mode is class-based (`darkMode: 'class'`). The app currently runs in dark mode by default.

### shadcn/ui
Component library whose source lives directly in [src/components/ui/](src/components/ui/) — not in `node_modules`. Components are copied in and owned, so they can be edited freely.

Components in use:

| File | Provides |
|---|---|
| `button.jsx` | `<Button>` with `variant` and `size` props |
| `separator.jsx` | `<Separator>` (thin horizontal rule) |
| `tabs.jsx` | `<Tabs>`, `<TabsList>`, `<TabsTrigger>` |
| `checkbox.jsx` | `<Checkbox>` |
| `input.jsx` | `<Input>` |
| `label.jsx` | `<Label>` |
| `card.jsx` | `<Card>` |
| `section-title.jsx` | `<SectionTitle>` — small uppercase heading used throughout sidebars |

### Radix UI
Headless accessible primitives underlying the shadcn components. Imported directly by the ui components — app code never imports Radix directly.

Primitives used: `@radix-ui/react-checkbox`, `@radix-ui/react-label`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`, `@radix-ui/react-slot`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`.

### Utility helpers
- **`clsx`** + **`tailwind-merge`** — combined into `cn()` in `src/lib/utils.js`. Used everywhere to merge conditional classnames without specificity conflicts.
- **`class-variance-authority`** (cva) — used inside `button.jsx` to define variant/size combinations declaratively.

---

## Build & dev server

### Vite
Config at [vite.config.js](vite.config.js).

- `@vitejs/plugin-react` — JSX transform + Fast Refresh
- Path alias: `@` → `./src` (used in all imports: `@/components/ui/button`)
- Dev server port: **4000**

### Custom Vite middleware (file persistence API)
The config registers two in-process HTTP endpoints so the app can read/write JSON files on disk during development:

```
GET  /api/characters   → reads  characters.json
POST /api/characters   → writes characters.json

GET  /api/defaults     → reads  character-defaults.json
POST /api/defaults     → writes character-defaults.json
```

These are NOT a production server — they exist only while `vite dev` is running. In a deployed build these endpoints would be absent; only localStorage would persist state.

---

## State management

No Redux, Zustand, or Context. All state lives in `App.jsx` and is passed down as props.

### React state in App.jsx
| State | Type | Purpose |
|---|---|---|
| `characters` | `Character[]` | All characters; persisted to localStorage + file |
| `activeCharId` | `string` | Which character is selected |
| `currentAnimation` | `string` | Active animation key |
| `isPlaying` | `boolean` | Animation playback |
| `customWeapons` | `[{key, label}]` | Runtime weapon types; persisted to `2dsprite:custom-weapons` localStorage |
| `animTemplates` | `Template[]` | Global animation templates; persisted to `2dsprite:templates` localStorage |
| `editAnimPose` | `boolean` | Whether bone-drag edits write to the animation layer |
| `showBones / showVectors / ragdoll / ...` | `boolean` | Canvas overlay toggles |

### Per-character state shape
```js
{
  id, name,
  parts: {
    weapon, head, body, ...,          // option keys
    customColors:     { [partKey]: '#hex' },
    partScales:       { [partKey]: number },
    weaponImages:     { [weaponKey]: dataUrl },
    weaponScales:     { [weaponKey]: number },
    weaponOffsets:    { [weaponKey]: {x,y,rotation} },
    weaponAnimOffsets:{ [weaponKey]: { [animId]: {x,y,rotation} } },
  },
  boneOffsets:           { [boneId]: {x?,y?,rotation?} },
  skinOverrides:         { [skinKey]: point[][] },
  animBoneOffsets:       { [animId]: { [boneId]: {x?,y?,rotation?} } },
  animKeyframeOverrides: { [animId]: { [boneId]: { [timeKey]: {x?,y?,rotation?} } } },
  customAnimations:      [{ id, name, duration, loop, tracks }],
  defaultBoneOffsets:    { ... },
  defaultSkinOverrides:  { ... },
}
```

### stateRef pattern (CharacterCanvas.jsx)
`CharacterCanvas` runs a `requestAnimationFrame` loop that must read the latest prop values without triggering React re-renders. All frequently-read props are mirrored into a mutable `stateRef.current` object on every render:

```js
stateRef.current.currentAnimation = currentAnimation;
stateRef.current.isPlaying        = isPlaying;
// ... etc
```

The RAF callback reads from `stateRef.current`, never from React state directly. This is the correct pattern for 60 FPS canvas loops in React.

---

## Canvas rendering pipeline

Every frame:

```
resolveAnimation(baseAnim, keyframeOverrides)   → mergedAnim
getPoseAtTime(mergedAnim, time)                  → animPose      { boneId: {x,y,rotation} }
mergeOffsets(animPose, animBoneOffsets[animId])  → fullPose      (adds time-invariant offsets)
computeWorldTransforms(fullPose)                 → worldTransforms
renderCharacter(ctx, character, worldTransforms, options)
```

The animation lookup always checks per-character custom animations first:
```js
character.customAnimations?.find(a => a.id === key) ?? ANIMATIONS[key]
```

### Coordinate system
- Canvas origin: centre-bottom of the sprite frame
- Character-local space: `torso` at `(0, 0)`, Y increases downward, rotations in radians clockwise
- `BASE_SCALE = 2.5` scales character units to canvas pixels; zoom multiplies on top

### Draw order (back → front)
```
left_leg → right_leg → right_arm (char's LEFT) → body → head → weapon → left_arm (char's RIGHT) → head_prop
```
The bone names in code are mirrored relative to the character's perspective — see CLAUDE.md for the full explanation. This order is fixed; no per-animation or per-weapon overrides.

### Canvas background
`#FFE699` — drawn as a filled rect every frame before any character drawing.

---

## Animation system

Animations are defined as keyframe tracks in `AnimationSystem.js`:

```js
{
  name: 'Walk',
  duration: 0.80,
  loop: true,
  tracks: {
    torso:    [{ time: 0, x: 0, y: 0, rotation: 0 }, ...],
    left_arm: [...],
  }
}
```

Interpolation between keyframes uses **smoothstep** (`t² × (3 − 2t)`), not linear.

### Animation layers (additive, per-character)
Three delta layers sit on top of base animation data and compose at render time:

| Layer | Storage | Cleared by |
|---|---|---|
| Keyframe deltas (ragdoll) | `animKeyframeOverrides[animId][boneId][timeKey]` | "Commit edits" |
| Time-invariant pose offset | `animBoneOffsets[animId][boneId]` | "Commit edits" / Reset |
| Weapon anchor | `parts.weaponAnimOffsets[weapon][animId]` | Weapon offset reset |

"Commit edits" bakes all three layers into `customAnimations` using the same animation ID as the source (shadowing built-ins rather than creating new chips).

### Weapon animation sets
`WEAPON_ANIMATION_SETS` maps each weapon key to the list of animation IDs available for it. Custom weapon keys not in this map fall back to the `none` set automatically.

---

## Persistence

| Data | Mechanism | Priority |
|---|---|---|
| Characters | localStorage (`2dsprite:characters`) + `characters.json` (via Vite middleware) | File wins on load |
| Default build | `character-defaults.json` (via Vite middleware) | — |
| Animation templates | localStorage (`2dsprite:templates`) | — |
| Custom weapon modes | localStorage (`2dsprite:custom-weapons`) | — |

Writes to `characters.json` are debounced 600 ms to avoid hammering disk on every keystroke.

---

## Performance patterns

- **`React.memo`** on `CharacterBuilder`, `AnimationControls`, `AnimationCurvePanel` — prevents sidebar re-renders when unrelated App state (e.g. playback position) changes.
- **`useMemo`** for `resolveAnimation` and `resolveWeaponOffset` in App.jsx — both are called in JSX; memoised on their actual deps rather than running on every render.
- **`EMPTY_OBJ` constant** — a single module-level `{}` used in place of inline `{}` literals in props, so memoised children see stable references.
- **Skins cache in stateRef** — the `getSkin()` loop (builds skin point arrays from overrides) runs only when `skinOverrides` reference changes, not on every RAF frame.
- **Batched canvas paths** — all grid lines are drawn in two `beginPath/stroke` calls (one per stroke style) rather than one call per line.
- **stateRef pattern** — props mirrored to a mutable ref read by the RAF loop; no React state reads inside the 60 FPS draw callback.

---

## Project layout

```
2DSPRITE/
  src/
    systems/          — engine: skeleton, animation, skin, renderer, vector editor, IK
    data/             — static definitions: CHARACTER_PARTS, ANIMATIONS, default build values
    components/       — React UI components
      ui/             — shadcn/ui owned components
    utils/            — pure helpers: transforms, export, weapon settings, genId, math
    App.jsx           — root state owner
    index.css         — Tailwind directives + CSS custom properties (theme tokens)
  characters.json     — persisted character state (written by Vite middleware)
  character-defaults.json — default pose checkpoint
  vite.config.js      — build config + file persistence API middleware
  tailwind.config.js  — Tailwind theme mapping CSS vars → utility classes
  CLAUDE.md           — AI coding guidelines and architecture reference
  tech-implementation.md — this file
```
