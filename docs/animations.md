# Animations

How the animation system is implemented and what gets persisted for each
animation sequence.

## Layers

Three layers feed the final pose every frame:

| Layer | Source | Storage |
|---|---|---|
| Built-in animations | `src/systems/AnimationSystem.js` (`ANIMATIONS`) | Code, ships in source |
| Custom animations | "+ New" pose editor, baked via `poseToAnimation.js` | Per-character: `character.customAnimations[]` |
| Per-character pose offsets | Edit Pose toggle (ragdoll on top of a running anim) | Per-character: `character.animBoneOffsets[animId]` |

At render time the three are composed additively (see *Composition pipeline*).

## Animation structure

Every animation — built-in, custom, or otherwise — has the same shape:

```js
{
  name: 'Rifle',
  duration: 0.6,           // seconds for one full cycle
  loop: true,              // when false, fires onAnimationComplete at end
  tracks: {
    torso:        [ keyframe, keyframe, ... ],
    right_arm:    [ keyframe, keyframe, ... ],
    right_forearm:[ keyframe, ... ],
    // one key per bone that the animation actually moves
  }
}
```

`tracks` is a map from bone id (see `BONES` in `SkeletonSystem.js`) to an
array of keyframes. Bones not listed default to zero — i.e. they stay in
their rest pose plus any per-character offsets.

### Keyframe format

```js
{ time: 0.18, x?: number, y?: number, rotation?: number }
```

- `time` is in seconds, measured from the start of the cycle. Times must
  be non-decreasing within a track.
- `x` / `y` are **additive deltas** on the bone's rest position (in the
  parent's local frame). For non-root bones these are usually omitted —
  cyclical motion is mostly rotational.
- `rotation` is **additive** to `bone.baseRotation` in the parent's
  local frame, in radians, positive = CW in screen space (y-down).
- Each property is independently interpolated — a keyframe can set
  `rotation` without forcing `x`/`y` to anything, and the missing
  properties fall back to `0` for that keyframe.
- Different bones can have different keyframe counts and timings.

Example track from `rifle` ([AnimationSystem.js](../src/systems/AnimationSystem.js)):

```js
torso: [
  { time: 0.00, x:  0, y:  0, rotation:  0.04 },
  { time: 0.03, x: -6, y:  0, rotation:  0.02 },   // BANG
  { time: 0.14, x: -3, y:  0, rotation:  0.05 },
  { time: 0.30, x:  1, y:  0, rotation:  0.06 },   // overshoot
  { time: 0.45, x:  0, y:  0, rotation:  0.04 },   // settle
  { time: 0.60, x:  0, y:  0, rotation:  0.04 },
],
```

## Interpolation

Sampling at an arbitrary time is done by `trackValueAt(keyframes, time, prop)`
in [AnimationSystem.js](../src/systems/AnimationSystem.js). The math:

1. **Clamp at the ends.** If `time ≤ first.time` return the first value;
   if `time ≥ last.time` return the last. No extrapolation.
2. **Find the bracketing pair** `(a, b)` such that `a.time ≤ time ≤ b.time`.
3. **Normalize**:
   ```
   t = (time − a.time) / (b.time − a.time)        // t ∈ [0, 1]
   ```
4. **Smoothstep ease** the parameter:
   ```
   s = t · t · (3 − 2t)
   ```
5. **Lerp**:
   ```
   result = a.value + (b.value − a.value) · s
   ```

Smoothstep is a cubic Hermite that flattens slope at both ends, giving a
soft ease-in/ease-out for every segment. There are **no per-keyframe
tangents and no easing modes** — every segment uses the same curve shape.
To get snappier motion (anticipation, overshoot, hold) you add more
keyframes that shape the curve explicitly, as the punch and rifle
animations do.

`getPoseAtTime(animation, time)` runs `trackValueAt` for each tracked
bone's `x`, `y`, `rotation` and returns a `{ boneId: {x, y, rotation} }` map.

## Composition pipeline

Inside `CharacterCanvas.drawFrame` each render:

```js
const animPose          = getPoseAtTime(anim, s.time);                // layer 1: built-in / custom anim
const animSpecificOff   = animBoneOffsets[currentAnimation] ?? {};    // layer 2: per-anim character offsets
const persistentOffsets = mergeOffsets(
  mergeOffsets(boneOffsets, animSpecificOff),                         // character rest pose + per-anim edit
  ragdollOverlay,                                                     // ephemeral Edit-mode ragdoll
);
const fullPose          = mergeOffsets(animPose, persistentOffsets);
const worldTransforms   = computeWorldTransforms(fullPose);
```

`mergeOffsets(a, b)` adds `x`, `y`, `rotation` component-wise; missing
fields read as 0. `computeWorldTransforms` walks the bone tree, composing
each bone's local offset and rotation with its parent's world transform
to produce a flat `{ boneId: { x, y, rotation } }` map in character-local
coordinates, which the renderer and IK use.

## Per-animation pose offsets (Edit Pose)

`character.animBoneOffsets` shape:

```jsonc
{
  "rifle":     { "right_arm": { "x": 0, "y": 0, "rotation": -0.05 }, ... },
  "sword_idle":{ "left_forearm": { "rotation": 0.20 }, ... }
}
```

Keyed by animation id (built-in name or custom animation id). Each entry is
a *single* `{x, y, rotation}` per bone — **time-invariant**. The same offset
is added to the animation pose at every frame, so it shifts the curve as a
whole rather than reshaping it.

This makes Edit Pose good for "the character holds the support hand a bit
lower throughout the rifle anim" and not suitable for "the recoil should
kick harder on the firing frame than at rest" — the latter requires
authoring keyframes directly.

## Custom animations (+ New)

When you click **+ New**, the pose editor lets you set explicit poses at
several time points (called "frames" in the UI). On save, [poseToAnimation.js](../src/utils/poseToAnimation.js)
converts those frames into a normal `{ name, duration, loop, tracks }`
object and pushes it onto `character.customAnimations`.

The result is structurally identical to a built-in animation, so the
sampler and composition pipeline don't care which list an animation
came from. The UI looks up `ANIMATIONS[id] ?? customAnimations.find(...)`
to resolve the current animation each frame.

## Persistence

Built-in animations are part of the source tree — they change only when
`AnimationSystem.js` is edited.

Per-character data — `boneOffsets`, `animBoneOffsets`, `customAnimations`,
`skinOverrides`, `defaultBoneOffsets`, `defaultSkinOverrides` — lives on
each character object and is persisted by `persistCharacters()` in
[App.jsx](../src/App.jsx). Every change to the `characters` state schedules
a debounced (600 ms) write:

1. `localStorage.setItem('2dsprite:characters', JSON.stringify(chars))`
2. `POST /api/characters` — the Vite dev plugin in [vite.config.js](../vite.config.js)
   writes the JSON to `characters.json` on disk.

On mount, App hydrates from `localStorage` first, then fetches
`/api/characters`. **The file wins** if it returns data, so the on-disk
JSON is the source of truth.

`characters.json` is currently tracked in git, which means saved edits
become part of the repo's diff and will be pushed if committed.

## Coordinate conventions

- **Y is down** in screen space and in character-local space.
- **Positive rotation is clockwise** in that y-down frame. A bone with
  `rotation = 0` and rest offset `(0, 40)` extends straight down from
  its parent joint.
- Bone positions and rotations cascade through the parent chain in
  `computeWorldTransforms` — a parent's rotation reorients every
  descendant's local frame.
- The character is drawn with its torso root translated to `(ORIGIN_X,
  ORIGIN_Y)` and scaled by `BASE_SCALE` (constants in
  [CharacterCanvas.jsx](../src/components/CharacterCanvas.jsx)).

## Where to look in code

| Concern | File |
|---|---|
| Built-in animations | `src/systems/AnimationSystem.js` |
| Keyframe interpolation | `src/systems/AnimationSystem.js` (`trackValueAt`, `getPoseAtTime`) |
| Bone tree + world transforms | `src/systems/SkeletonSystem.js` |
| Layer merging | `src/utils/transforms.js` (`mergeOffsets`) |
| Render-time composition | `src/components/CharacterCanvas.jsx` (`drawFrame`) |
| Pose editor → custom animation | `src/utils/poseToAnimation.js`, `src/components/PoseEditor.jsx` |
| Persistence | `src/App.jsx` (`persistCharacters`, `loadCharactersFromStorage`), `vite.config.js` (`/api/characters`) |
