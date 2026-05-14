---
name: add-walk-action-anim
description: Compose a "walk + action" animation (walk_shoot, walk_slash, walk_fire) by layering an action's recoil/swing motion onto the matching walk animation, preserving every walk keyframe so the new animation is interchangeable with the walk at cycle boundaries (and ideally at every walk keyframe). Invoke when the user says "make a walk+X animation", "add a walking-while-firing animation", "create walk slash", etc.
---

# add-walk-action-anim

Build a combined "walk while doing X" animation from an existing `<weapon>_walk`
and `<weapon>_<action>` pair (e.g. `rifle_walk` + `rifle` → `rifle_walk_shoot`).
The result is a third animation that:

- shares `<weapon>_walk`'s duration and leg/feet/shin/lower_torso tracks
  verbatim (so the stride reads identical and is mid-cycle interchangeable);
- preserves every `<weapon>_walk` upper-body keyframe **time and value** that
  can be preserved, so game-side `<weapon>_walk ↔ <weapon>_walk_X` transitions
  at those instants produce zero pose pop;
- injects the action's recoil/swing motion **between** walk keyframes when the
  action fits in one inter-keyframe slot (recoil/snap kind), or distributes it
  across the cycle when it doesn't (full slash kind).

## When to use which design

The walk's keyframes for a given track tell you the "transition-safe" times.
The action's motion magnitude tells you whether it fits.

| Action magnitude | Design |
|---|---|
| Small + brief (recoil, single shot, kick) | **Inject-between-keyframes**: walk keyframes preserved at every existing time; action pulse added at intermediate times inside one inter-walk-keyframe slot (typically t≈0.10 for an 0.18-period walk). |
| Large + sustained (full slash, big windmill) | **Compress-across-cycle**: only walk's start (t=0) and end (t=duration) values preserved on the affected upper-body bones; action plays out across the cycle. Legs/feet/lower_torso still preserved. |

If unsure, **default to inject-between-keyframes** and ask the user.

## Workflow

### 1. Read the source animations

Open `src/systems/AnimationSystem.js` and read the two source anims in full
(both `<weapon>_walk` and the action anim, typically `<weapon>` for a shoot
or `<weapon>_slash` / `<weapon>_fire`). Note for each:

- The walk's `duration` and complete keyframe list per track. These are the
  "transition-safe values" you must preserve.
- The action's pose deltas relative to the walk's baseline for the upper-body
  bones (arms, forearms, hands, head, torso rotation).

### 2. Pick the design

- **Inject** if the action's full swing happens in ≤ half of one walk
  inter-keyframe gap. Pick a fire instant `t_fire` strictly between two walk
  keyframes (e.g. 0.10 between walk's 0.00 and 0.18). The recoil/snap must
  fully resolve back to the walk pose at the next walk keyframe.
- **Compress** if the action's swing exceeds that. Slot the action's wind-up
  / impact / follow-through proportionally across the walk's cycle (e.g.
  wind-up by t=0.16, impact at t=0.30, recovery by t=0.55, walk pose at
  t=duration).

### 3. Write the new animation entry

Place it **immediately before** the corresponding `<weapon>_walk` entry in
`AnimationSystem.js`. Naming: `<weapon>_walk_<action>` (e.g.
`rifle_walk_shoot`, `sword_walk_slash`, `rocket_walk_fire`). UI `name:`
short and clear ("Walk Shoot", "Walk Slash", "Walk Fire").

Tracks to write:

- **`torso`** — keep walk's y-bounce keyframes literally. For inject design,
  add intermediate keyframes to host the rotation jolt and (for big recoils
  like the rocket) x-shove. For compress design, hybridize: keep walk y,
  override rotation with the action's curve.
- **`lower_torso`** — almost always keep walk's keyframes verbatim. Inject
  design may add one absorb keyframe (e.g. `-0.04` at t_fire) before
  returning to the walk value.
- **`head`** — walk baseline plus a brief jolt around t_fire for inject; for
  compress, use the action's full head curve.
- **`right_arm`, `right_forearm`, `right_hand`** — these carry the action.
  Inject: walk's values at every walk keyframe time; spike at t_fire matches
  the action's peak rotation delta vs walk baseline (read `<weapon>` source
  for the magnitude). Compress: walk's values only at t=0 and t=duration.
- **`left_arm`, `left_forearm`, `left_hand`** — counterweight/support hand.
  Same pattern as right but smaller magnitudes.
- **`left_leg`, `left_shin`, `left_foot`, `right_leg`, `right_shin`,
  `right_foot`** — **copy verbatim from `<weapon>_walk`**. The recoil/swing
  doesn't affect the stride.

For inject design, "walk keyframe times" on a track with fewer keyframes
(e.g. arms with 3 keyframes per walk cycle) include both the explicit
keyframes AND the implicit interpolated values at the walk's other keyframe
times — match the interpolated value to avoid mid-cycle pops at common
transition points.

### 4. Register in the weapon's animation set

Add the new id to `WEAPON_ANIMATION_SETS` for that weapon, positioning it
next to the walk (most natural reading order is `<weapon>_walk,
<weapon>_walk_<action>`, then the standalone action). Example:

```js
rifle: ['rifle_idle', 'rifle_walk', 'rifle_walk_shoot', 'rifle_run', 'rifle_jump', 'rifle', 'full_auto'],
```

No update to `WEAPON_DEFAULT_ANIMATIONS` (the walk-action variant is never a
weapon default). No `ANIMATION_COMPLETE_TARGETS` entry if it's `loop: true`.

### 5. Report what's transition-safe

Tell the user explicitly which transition points are guaranteed pop-free.
For inject design that's "every walk keyframe time"; for compress design
it's "the cycle boundary (t=0 == t=duration)". Mention any trade-off (e.g.
"slash is too big to fit between walk keyframes, so upper body diverges
mid-cycle").

## Gotchas

- **Smoothstep interpolation, not linear** — the renderer eases between
  keyframes. If two walk keyframes are at t=0 and t=0.18 with values
  1.15 and 1.32, the interpolated value at t=0.09 is **not** the midpoint
  1.235; it's `lerp(1.15, 1.32, smoothstep(0.5)) = 1.235` (same here, but
  matters for non-midpoint). When you need to match walk's value at a
  non-walk-keyframe time exactly, sample its smoothstep curve.

- **Walk's "lerp value at t=0.20"** is not always a hand-computable round
  number. If the walk has keyframes at t=0 and t=0.40 with values A and B,
  the interpolated value at t=0.20 is `(A + B) / 2` (smoothstep midpoint).
  Use this when adding walk-matched keyframes at off-walk times.

- **Recoil that includes an x-shove (rocket)** must reset x to 0 by the next
  walk keyframe — otherwise the character drifts mid-stride.

- **Don't introduce keyframes the walk doesn't have, ON walk keyframe times**
  with values that disagree with the walk's interpolation at that time. The
  whole point is "swap mid-cycle and nothing pops at the walk's keyframe
  instants."

- **Custom-animation pose offsets (`animBoneOffsets[id]`)** are per-animation
  — a user's Edit-Pose tweaks for `rifle_walk` do not carry over to
  `rifle_walk_shoot`. If they want those tweaks to apply, tell them to
  re-Edit-Pose on the new animation (or, eventually, add an inheritance
  field — but that's out of scope).

- **Verify in the UI**: switch to the new animation button (it appears
  automatically because the right panel iterates `WEAPON_ANIMATION_SETS`).
  Watch the loop for at least one cycle; check that legs read identical to
  the walk and that the action pulse is visible.
