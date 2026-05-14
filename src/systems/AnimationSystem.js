/**
 * Keyframe animation system.
 * Each animation is a collection of per-bone tracks.
 * Each track is an array of { time, x?, y?, rotation? } keyframes.
 *
 * Forearm bones add a natural elbow bend to every animation.
 * Positive forearm rotation = elbow bends forward (clockwise in canvas coords).
 */

export const ANIMATIONS = {
  edit: {
    name: 'Edit',
    duration: 1.0,
    loop: true,
    tracks: {},
  },

  idle: {
    name: 'Idle',
    duration: 2.0,
    loop: true,
    tracks: {
      torso: [
        { time: 0.0, y: 0,  rotation: 0 },
        { time: 1.0, y: -2, rotation: 0.01 },
        { time: 2.0, y: 0,  rotation: 0 },
      ],
      lower_torso: [
        { time: 0.0, y: 0 },
        { time: 1.0, y: -1 },
        { time: 2.0, y: 0 },
      ],
      head: [
        { time: 0.0, rotation: 0 },
        { time: 1.5, rotation: 0.03 },
        { time: 2.0, rotation: 0 },
      ],
      left_arm: [
        { time: 0.0, rotation: -1.023 },
        { time: 1.0, rotation: -0.993 },
        { time: 2.0, rotation: -1.023 },
      ],
      left_forearm: [
        { time: 0.0, rotation: -0.318 },
        { time: 1.0, rotation: -0.278 },
        { time: 2.0, rotation: -0.318 },
      ],
      // Right arm hangs down-and-to-the-right (visible outside the body)
      // with a subtle breathing bob.
      right_arm: [
        { time: 0.0, rotation: 1.022 },
        { time: 1.0, rotation: 0.992 },
        { time: 2.0, rotation: 1.022 },
      ],
      right_forearm: [
        { time: 0.0, rotation: -0.558 },
        { time: 1.0, rotation: -0.598 },
        { time: 2.0, rotation: -0.558 },
      ],
      left_hand: [
        { time: 0.0, rotation:  0.06 },
        { time: 1.0, rotation:  0.10 },
        { time: 2.0, rotation:  0.06 },
      ],
      right_hand: [
        { time: 0.0, rotation: -0.06 },
        { time: 1.0, rotation: -0.10 },
        { time: 2.0, rotation: -0.06 },
      ],
      // Slight resting knee bend
      left_shin: [
        { time: 0.0, rotation: 0.08 },
        { time: 1.0, rotation: 0.10 },
        { time: 2.0, rotation: 0.08 },
      ],
      right_shin: [
        { time: 0.0, rotation: 0.08 },
        { time: 1.0, rotation: 0.10 },
        { time: 2.0, rotation: 0.08 },
      ],
      // Feet rest with a slight forward tilt
      left_foot: [
        { time: 0.0, rotation: 0.05 },
        { time: 1.0, rotation: 0.07 },
        { time: 2.0, rotation: 0.05 },
      ],
      right_foot: [
        { time: 0.0, rotation: 0.05 },
        { time: 1.0, rotation: 0.07 },
        { time: 2.0, rotation: 0.05 },
      ],
    },
  },

  walk: {
    name: 'Walk',
    duration: 0.72,
    loop: true,
    tracks: {
      // Bigger bounce (6 units) + gentle counter-rotation opposing hips
      torso: [
        { time: 0.00, y:  0, rotation: -0.04 },
        { time: 0.18, y: -6, rotation:  0.00 },
        { time: 0.36, y:  0, rotation:  0.04 },
        { time: 0.54, y: -6, rotation:  0.00 },
        { time: 0.72, y:  0, rotation: -0.04 },
      ],
      // More hip sway for a slight waddle
      lower_torso: [
        { time: 0.00, rotation:  0.14 },
        { time: 0.18, rotation:  0.00 },
        { time: 0.36, rotation: -0.14 },
        { time: 0.54, rotation:  0.00 },
        { time: 0.72, rotation:  0.14 },
      ],
      // More pronounced head nod — lags behind torso for a secondary-motion feel
      head: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.22, rotation:  0.05 },
        { time: 0.36, rotation:  0.00 },
        { time: 0.58, rotation:  0.05 },
        { time: 0.72, rotation:  0.00 },
      ],
      // --- LEFT LEG ---
      left_leg: [
        { time: 0.00, rotation: -0.42 },
        { time: 0.36, rotation:  0.42 },
        { time: 0.72, rotation: -0.42 },
      ],
      // High knee lift during swing (0.65) — pitter-patter quality
      left_shin: [
        { time: 0.00, rotation: 0.10 },
        { time: 0.18, rotation: 0.08 },
        { time: 0.36, rotation: 0.18 },
        { time: 0.54, rotation: 0.65 },
        { time: 0.72, rotation: 0.10 },
      ],
      // More pointed toes at push-off for a tip-toe feel
      left_foot: [
        { time: 0.00, rotation: -0.22 },
        { time: 0.18, rotation:  0.00 },
        { time: 0.36, rotation:  0.30 },
        { time: 0.54, rotation: -0.10 },
        { time: 0.72, rotation: -0.22 },
      ],
      // --- RIGHT LEG ---
      right_leg: [
        { time: 0.00, rotation:  0.42 },
        { time: 0.36, rotation: -0.42 },
        { time: 0.72, rotation:  0.42 },
      ],
      right_shin: [
        { time: 0.00, rotation: 0.18 },
        { time: 0.18, rotation: 0.65 },
        { time: 0.36, rotation: 0.10 },
        { time: 0.54, rotation: 0.08 },
        { time: 0.72, rotation: 0.18 },
      ],
      right_foot: [
        { time: 0.00, rotation:  0.30 },
        { time: 0.18, rotation: -0.10 },
        { time: 0.36, rotation: -0.22 },
        { time: 0.54, rotation:  0.00 },
        { time: 0.72, rotation:  0.30 },
      ],
      // --- ARMS: reduced swing, more elbow bend → looks loose and bouncy ---
      left_arm: [
        { time: 0.00, rotation: -0.773 },
        { time: 0.36, rotation: -1.373 },
        { time: 0.72, rotation: -0.773 },
      ],
      left_forearm: [
        { time: 0.00, rotation: 0.012 },
        { time: 0.18, rotation: -0.258 },
        { time: 0.36, rotation: -0.358 },
        { time: 0.54, rotation: -0.258 },
        { time: 0.72, rotation: 0.012 },
      ],
      left_hand: [
        { time: 0.00, rotation:  0.18 },
        { time: 0.36, rotation:  0.06 },
        { time: 0.72, rotation:  0.18 },
      ],
      right_arm: [
        { time: 0.00, rotation: 0.772 },
        { time: 0.36, rotation: 1.372 },
        { time: 0.72, rotation: 0.772 },
      ],
      right_forearm: [
        { time: 0.00, rotation: -0.518 },
        { time: 0.18, rotation: -0.618 },
        { time: 0.36, rotation: -0.888 },
        { time: 0.54, rotation: -0.618 },
        { time: 0.72, rotation: -0.518 },
      ],
      right_hand: [
        { time: 0.00, rotation: -0.06 },
        { time: 0.36, rotation: -0.18 },
        { time: 0.72, rotation: -0.06 },
      ],
    },
  },

  run: {
    name: 'Run',
    duration: 0.45,
    loop: true,
    tracks: {
      // Forward lean + strong vertical drive (float phase = big bounce)
      torso: [
        { time: 0.000, y:  0,  rotation:  0.10 },
        { time: 0.113, y: -10, rotation:  0.12 },
        { time: 0.225, y:  0,  rotation:  0.10 },
        { time: 0.338, y: -10, rotation:  0.12 },
        { time: 0.450, y:  0,  rotation:  0.10 },
      ],
      // More hip rotation than walk — drives the long stride
      lower_torso: [
        { time: 0.000, rotation:  0.18 },
        { time: 0.113, rotation:  0.00 },
        { time: 0.225, rotation: -0.18 },
        { time: 0.338, rotation:  0.00 },
        { time: 0.450, rotation:  0.18 },
      ],
      // Head tilts slightly forward; nods on each strike with lag
      head: [
        { time: 0.000, rotation:  0.00 },
        { time: 0.140, rotation:  0.07 },
        { time: 0.225, rotation:  0.00 },
        { time: 0.365, rotation:  0.07 },
        { time: 0.450, rotation:  0.00 },
      ],
      // --- LEFT LEG: forward at t=0 (strike), back at t=0.225 (push-off) ---
      left_leg: [
        { time: 0.000, rotation: -0.60 },
        { time: 0.225, rotation:  0.60 },
        { time: 0.450, rotation: -0.60 },
      ],
      // Nearly straight at strike; aggressive knee lift (0.80) during swing
      left_shin: [
        { time: 0.000, rotation: 0.12 },
        { time: 0.113, rotation: 0.10 },
        { time: 0.225, rotation: 0.22 },
        { time: 0.338, rotation: 0.82 },
        { time: 0.450, rotation: 0.12 },
      ],
      // Dorsiflexed at strike; strongly pointed at push-off; tucked in swing
      left_foot: [
        { time: 0.000, rotation: -0.28 },
        { time: 0.113, rotation:  0.00 },
        { time: 0.225, rotation:  0.40 },
        { time: 0.338, rotation: -0.14 },
        { time: 0.450, rotation: -0.28 },
      ],
      // --- RIGHT LEG: back at t=0 (push-off), forward at t=0.225 (strike) ---
      right_leg: [
        { time: 0.000, rotation:  0.60 },
        { time: 0.225, rotation: -0.60 },
        { time: 0.450, rotation:  0.60 },
      ],
      right_shin: [
        { time: 0.000, rotation: 0.22 },
        { time: 0.113, rotation: 0.82 },
        { time: 0.225, rotation: 0.12 },
        { time: 0.338, rotation: 0.10 },
        { time: 0.450, rotation: 0.22 },
      ],
      right_foot: [
        { time: 0.000, rotation:  0.40 },
        { time: 0.113, rotation: -0.14 },
        { time: 0.225, rotation: -0.28 },
        { time: 0.338, rotation:  0.00 },
        { time: 0.450, rotation:  0.40 },
      ],
      // --- ARMS: pumping hard (~90° forearm bend held throughout) ---
      left_arm: [
        { time: 0.000, rotation: -0.493 },
        { time: 0.225, rotation: -1.653 },
        { time: 0.450, rotation: -0.493 },
      ],
      // Forearm stays bent ~90° and lags the upper arm slightly
      left_forearm: [
        { time: 0.000, rotation: 0.082 },
        { time: 0.113, rotation: -0.218 },
        { time: 0.225, rotation: -0.338 },
        { time: 0.338, rotation: -0.218 },
        { time: 0.450, rotation: 0.082 },
      ],
      left_hand: [
        { time: 0.000, rotation:  0.20 },
        { time: 0.225, rotation:  0.08 },
        { time: 0.450, rotation:  0.20 },
      ],
      right_arm: [
        { time: 0.000, rotation: 0.492 },
        { time: 0.225, rotation: 1.652 },
        { time: 0.450, rotation: 0.492 },
      ],
      right_forearm: [
        { time: 0.000, rotation: -0.538 },
        { time: 0.113, rotation: -0.658 },
        { time: 0.225, rotation: -0.958 },
        { time: 0.338, rotation: -0.658 },
        { time: 0.450, rotation: -0.538 },
      ],
      right_hand: [
        { time: 0.000, rotation: -0.08 },
        { time: 0.225, rotation: -0.20 },
        { time: 0.450, rotation: -0.08 },
      ],
    },
  },
  scared_run: {
    name: 'Panic',
    duration: 0.40,
    loop: true,
    tracks: {
      // Deep forward hunch + big bounce — desperate sprint
      torso: [
        { time: 0.000, y:  0,  rotation:  0.22 },
        { time: 0.100, y: -11, rotation:  0.24 },
        { time: 0.200, y:  0,  rotation:  0.22 },
        { time: 0.300, y: -11, rotation:  0.24 },
        { time: 0.400, y:  0,  rotation:  0.22 },
      ],
      lower_torso: [
        { time: 0.000, rotation:  0.18 },
        { time: 0.100, rotation:  0.00 },
        { time: 0.200, rotation: -0.18 },
        { time: 0.300, rotation:  0.00 },
        { time: 0.400, rotation:  0.18 },
      ],
      // Head craning backward — looking over shoulder at the danger
      head: [
        { time: 0.000, rotation: -0.35 },
        { time: 0.100, rotation: -0.28 },
        { time: 0.200, rotation: -0.38 },
        { time: 0.300, rotation: -0.28 },
        { time: 0.400, rotation: -0.35 },
      ],
      // Left arm: wild windmill — thrown back then whips forward-up in panic
      left_arm: [
        { time: 0.000, rotation: -0.173 },
        { time: 0.200, rotation: -2.373 },
        { time: 0.400, rotation: -0.173 },
      ],
      left_forearm: [
        { time: 0.000, rotation: 0.212 },
        { time: 0.100, rotation: 0.562 },  // droops behind on backswing
        { time: 0.200, rotation: -0.288 },  // trails as arm whips forward
        { time: 0.300, rotation: 0.012 },
        { time: 0.400, rotation: 0.212 },
      ],
      left_hand: [
        { time: 0.000, rotation:  0.35 },
        { time: 0.200, rotation:  0.08 },
        { time: 0.400, rotation:  0.35 },
      ],
      // Right arm: opposite phase — thrown wildly backward from forward position
      right_arm: [
        { time: 0.000, rotation: 1.169 },
        { time: 0.200, rotation: 3.169 },
        { time: 0.400, rotation: 1.169 },
      ],
      right_forearm: [
        { time: 0.000, rotation: -0.588 },
        { time: 0.100, rotation: -0.988 },
        { time: 0.200, rotation: -1.138 },  // trails on the big backswing
        { time: 0.300, rotation: -0.688 },
        { time: 0.400, rotation: -0.588 },
      ],
      right_hand: [
        { time: 0.000, rotation: -0.08 },
        { time: 0.200, rotation: -0.32 },
        { time: 0.400, rotation: -0.08 },
      ],
      // Legs: frantic stride, high heel kick behind
      left_leg: [
        { time: 0.000, rotation: -0.68 },
        { time: 0.200, rotation:  0.68 },
        { time: 0.400, rotation: -0.68 },
      ],
      left_shin: [
        { time: 0.000, rotation: 0.14 },
        { time: 0.100, rotation: 0.12 },
        { time: 0.200, rotation: 0.24 },
        { time: 0.300, rotation: 0.92 },
        { time: 0.400, rotation: 0.14 },
      ],
      left_foot: [
        { time: 0.000, rotation: -0.30 },
        { time: 0.100, rotation:  0.00 },
        { time: 0.200, rotation:  0.42 },
        { time: 0.300, rotation: -0.14 },
        { time: 0.400, rotation: -0.30 },
      ],
      right_leg: [
        { time: 0.000, rotation:  0.68 },
        { time: 0.200, rotation: -0.68 },
        { time: 0.400, rotation:  0.68 },
      ],
      right_shin: [
        { time: 0.000, rotation: 0.24 },
        { time: 0.100, rotation: 0.92 },
        { time: 0.200, rotation: 0.14 },
        { time: 0.300, rotation: 0.12 },
        { time: 0.400, rotation: 0.24 },
      ],
      right_foot: [
        { time: 0.000, rotation:  0.42 },
        { time: 0.100, rotation: -0.14 },
        { time: 0.200, rotation: -0.30 },
        { time: 0.300, rotation:  0.00 },
        { time: 0.400, rotation:  0.42 },
      ],
    },
  },

  jump: {
    // Cycle = 0.9 s jump + ~1 s held in landing pose before the next jump.
    // Keyframes end at t=0.9; sampling past that clamps to the last keyframe.
    name: 'Jump',
    duration: 1.9,
    loop: true,
    tracks: {
      torso: [
        { time: 0.0,  y:   0, rotation: 0 },
        { time: 0.12, y:  26, rotation: 0 },  // root(8) + torso(5) ×2
        { time: 0.35, y: -88, rotation: 0 },  // root(-38) + torso(-6) ×2
        { time: 0.58, y: -16, rotation: 0 },  // root(-10) + torso(≈2) ×2
        { time: 0.68, y:  16, rotation: 0 },  // root(4) + torso(4) ×2
        { time: 0.80, y:  -2, rotation: 0 },  // root(-3) + torso(≈2) ×2
        { time: 0.9,  y:   0, rotation: 0 },
      ],
      lower_torso: [
        { time: 0.0,  y:  0 },
        { time: 0.12, y:  6 },
        { time: 0.35, y: -6 },
        { time: 0.68, y:  4 },
        { time: 0.9,  y:  0 },
      ],
      left_leg: [
        { time: 0.0,  rotation:  0 },
        { time: 0.12, rotation: -0.35 },
        { time: 0.35, rotation: -0.5 },
        { time: 0.58, rotation:  0.1 },
        { time: 0.68, rotation: -0.25 },
        { time: 0.9,  rotation:  0 },
      ],
      right_leg: [
        { time: 0.0,  rotation:  0 },
        { time: 0.12, rotation:  0.35 },
        { time: 0.35, rotation:  0.5 },
        { time: 0.58, rotation: -0.1 },
        { time: 0.68, rotation:  0.25 },
        { time: 0.9,  rotation:  0 },
      ],
      left_arm: [
        { time: 0.0,  rotation: -1.073 },
        { time: 0.12, rotation: -0.573 },
        { time: 0.35, rotation: -1.773 },
        { time: 0.68, rotation: -0.673 },
        { time: 0.9,  rotation: -1.073 },
      ],
      // Forearm drags behind upper arm like a pendulum
      left_forearm: [
        { time: 0.0,  rotation: -0.318 },
        { time: 0.12, rotation: 0.062 },  // droop during crouch
        { time: 0.35, rotation: -0.738 },  // trails as arm rises
        { time: 0.68, rotation: 0.162 },  // bounces on land
        { time: 0.9,  rotation: -0.318 },
      ],
      right_arm: [
        { time: 0.0,  rotation: 2.069 },
        { time: 0.12, rotation: 1.569 },
        { time: 0.35, rotation: 2.769 },
        { time: 0.68, rotation: 1.669 },
        { time: 0.9,  rotation: 2.069 },
      ],
      right_forearm: [
        { time: 0.0,  rotation: -0.558 },
        { time: 0.12, rotation: -0.938 },
        { time: 0.35, rotation: -0.138 },
        { time: 0.68, rotation: -1.038 },
        { time: 0.9,  rotation: -0.558 },
      ],
      left_hand: [
        { time: 0.0,  rotation:  0.06 },
        { time: 0.12, rotation:  0.45 },
        { time: 0.35, rotation: -0.25 },
        { time: 0.68, rotation:  0.55 },
        { time: 0.9,  rotation:  0.06 },
      ],
      right_hand: [
        { time: 0.0,  rotation: -0.06 },
        { time: 0.12, rotation: -0.45 },
        { time: 0.35, rotation:  0.25 },
        { time: 0.68, rotation: -0.55 },
        { time: 0.9,  rotation: -0.06 },
      ],
      // Knees bend hard on crouch/land, extend at apex
      left_shin: [
        { time: 0.0,  rotation: 0.08 },
        { time: 0.12, rotation: 0.65 },
        { time: 0.35, rotation: 0.10 },
        { time: 0.58, rotation: 0.08 },
        { time: 0.68, rotation: 0.55 },
        { time: 0.9,  rotation: 0.08 },
      ],
      right_shin: [
        { time: 0.0,  rotation: 0.08 },
        { time: 0.12, rotation: 0.65 },
        { time: 0.35, rotation: 0.10 },
        { time: 0.58, rotation: 0.08 },
        { time: 0.68, rotation: 0.55 },
        { time: 0.9,  rotation: 0.08 },
      ],
      // Feet: point down at apex, flex up to absorb landing
      left_foot: [
        { time: 0.0,  rotation:  0.05 },
        { time: 0.12, rotation: -0.20 },  // tucks on crouch
        { time: 0.35, rotation:  0.35 },  // points down at apex
        { time: 0.58, rotation: -0.20 },  // flexes up for landing
        { time: 0.68, rotation:  0.10 },  // absorbs impact
        { time: 0.9,  rotation:  0.05 },
      ],
      right_foot: [
        { time: 0.0,  rotation:  0.05 },
        { time: 0.12, rotation: -0.20 },
        { time: 0.35, rotation:  0.35 },
        { time: 0.58, rotation: -0.20 },
        { time: 0.68, rotation:  0.10 },
        { time: 0.9,  rotation:  0.05 },
      ],
      head: [
        { time: 0.0,  rotation:  0 },
        { time: 0.35, rotation: -0.1 },
        { time: 0.68, rotation:  0.08 },
        { time: 0.9,  rotation:  0 },
      ],
    },
  },

  punch: {
    name: 'Punch',
    // Strike resolves at ~0.60s; the rest is a held idle so the animation
    // pauses before looping back into the next punch.
    duration: 1.50,
    loop: true,
    tracks: {
      // Character faces +X — the strike drives toward the right.
      // Torso winds back (CW lean toward -X), then snaps forward (CCW).
      torso: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.18, rotation:  0.22 },   // wind back
        { time: 0.28, rotation: -0.32 },   // snap into strike
        { time: 0.40, rotation: -0.20 },   // follow-through
        { time: 0.60, rotation:  0.00 },
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.18, rotation:  0.10 },
        { time: 0.28, rotation: -0.18 },
        { time: 0.40, rotation: -0.10 },
        { time: 0.60, rotation:  0.00 },
      ],
      head: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.18, rotation:  0.14 },   // chin tucks toward back shoulder
        { time: 0.28, rotation: -0.10 },   // snaps forward with body
        { time: 0.60, rotation:  0.00 },
      ],

      // Right arm — the puncher. Chambers tight, then whips out to +X for
      // full extension. R_arm = -π/2 extends the forearm to +X; the forearm
      // coils with negative rotation so the wrist sweeps over-the-top.
      right_arm: [
        { time: 0.00, rotation: 0.000 },   // T-pose rest — arm extended +X
        { time: 0.18, rotation: 1.372 },   // chamber: arm pulls back/up
        { time: 0.20, rotation: 1.372 },
        { time: 0.28, rotation: 0.192 },   // STRIKE — arm level horizontal (+X)
        { time: 0.36, rotation: 0.272 },   // impact hold (slight recoil)
        { time: 0.60, rotation: 0.000 },
      ],
      right_forearm: [
        { time: 0.00, rotation: -0.438 },
        { time: 0.18, rotation: -3.238 },   // tightly coiled back, fist by shoulder
        { time: 0.20, rotation: -3.238 },
        { time: 0.26, rotation: -0.388 },   // snaps straight just before peak (level with arm)
        { time: 0.40, rotation: -0.388 },   // hold extension
        { time: 0.60, rotation: -0.438 },
      ],
      right_hand: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.18, rotation: -0.55 },   // wrist cocked
        { time: 0.28, rotation:  0.20 },   // wrist snaps through impact
        { time: 0.40, rotation:  0.10 },
        { time: 0.60, rotation:  0.00 },
      ],

      // Left arm — pulls up into guard while the right arm fires.
      left_arm: [
        { time: 0.00, rotation: -1.073 },
        { time: 0.18, rotation: -1.373 },
        { time: 0.28, rotation: -0.123 },   // up to guard
        { time: 0.40, rotation: -0.273 },
        { time: 0.60, rotation: -1.073 },
      ],
      left_forearm: [
        { time: 0.00, rotation: -0.438 },
        { time: 0.18, rotation: -0.038 },
        { time: 0.28, rotation: -1.488 },   // tucked tight to chin
        { time: 0.40, rotation: -1.288 },
        { time: 0.60, rotation: -0.438 },
      ],

      // Stance: load on the back leg, drive forward through the strike.
      left_leg: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.18, rotation:  0.12 },   // load
        { time: 0.28, rotation: -0.18 },   // push off toward +X
        { time: 0.60, rotation:  0.00 },
      ],
      right_leg: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.18, rotation: -0.14 },
        { time: 0.28, rotation:  0.10 },
        { time: 0.60, rotation:  0.00 },
      ],
      left_shin:  [{ time: 0.00, rotation: 0.15 }, { time: 0.60, rotation: 0.15 }],
      right_shin: [{ time: 0.00, rotation: 0.15 }, { time: 0.60, rotation: 0.15 }],
    },
  },

  carry_walk: {
    name: 'Carry',
    duration: 0.90,
    loop: true,
    tracks: {
      // Hunched forward under the weight; smaller bounce
      torso: [
        { time: 0.000, y:  0, rotation:  0.15 },
        { time: 0.225, y: -2, rotation:  0.16 },
        { time: 0.450, y:  0, rotation:  0.15 },
        { time: 0.675, y: -2, rotation:  0.16 },
        { time: 0.900, y:  0, rotation:  0.15 },
      ],
      // Hips tilt slightly back to counter the forward hunch
      lower_torso: [
        { time: 0.000, rotation: -0.05 },
        { time: 0.225, rotation: -0.10 },
        { time: 0.450, rotation: -0.05 },
        { time: 0.675, rotation: -0.10 },
        { time: 0.900, rotation: -0.05 },
      ],
      // Head compensates for hunch — stays roughly level
      head: [
        { time: 0.0, rotation: -0.12 },
        { time: 0.9, rotation: -0.12 },
      ],
      // Left arm: stretches leftward (past vertical — tilted to screen-left, away from face)
      left_arm: [
        { time: 0.000, rotation: -4.773 },
        { time: 0.450, rotation: -4.823 },
        { time: 0.900, rotation: -4.773 },
      ],
      left_forearm: [
        { time: 0.000, rotation: -0.688 },
        { time: 0.450, rotation: -0.638 },
        { time: 0.900, rotation: -0.688 },
      ],
      left_hand: [
        { time: 0.0, rotation: -0.08 },
        { time: 0.9, rotation: -0.08 },
      ],
      // Right arm: spread backward (past vertical — tilted toward back)
      right_arm: [
        { time: 0.000, rotation: -1.481 },
        { time: 0.450, rotation: -1.531 },
        { time: 0.900, rotation: -1.481 },
      ],
      right_forearm: [
        { time: 0.000, rotation: -0.718 },
        { time: 0.450, rotation: -0.658 },
        { time: 0.900, rotation: -0.718 },
      ],
      right_hand: [
        { time: 0.0, rotation: -0.10 },
        { time: 0.9, rotation: -0.10 },
      ],
      // Shorter stride — carrying weight = careful steps
      left_leg: [
        { time: 0.000, rotation: -0.35 },
        { time: 0.450, rotation:  0.35 },
        { time: 0.900, rotation: -0.35 },
      ],
      left_shin: [
        { time: 0.000, rotation: 0.10 },
        { time: 0.225, rotation: 0.08 },
        { time: 0.450, rotation: 0.16 },
        { time: 0.675, rotation: 0.48 },
        { time: 0.900, rotation: 0.10 },
      ],
      left_foot: [
        { time: 0.000, rotation: -0.18 },
        { time: 0.225, rotation:  0.00 },
        { time: 0.450, rotation:  0.25 },
        { time: 0.675, rotation: -0.08 },
        { time: 0.900, rotation: -0.18 },
      ],
      right_leg: [
        { time: 0.000, rotation:  0.35 },
        { time: 0.450, rotation: -0.35 },
        { time: 0.900, rotation:  0.35 },
      ],
      right_shin: [
        { time: 0.000, rotation: 0.16 },
        { time: 0.225, rotation: 0.48 },
        { time: 0.450, rotation: 0.10 },
        { time: 0.675, rotation: 0.08 },
        { time: 0.900, rotation: 0.16 },
      ],
      right_foot: [
        { time: 0.000, rotation:  0.25 },
        { time: 0.225, rotation: -0.08 },
        { time: 0.450, rotation: -0.18 },
        { time: 0.675, rotation:  0.00 },
        { time: 0.900, rotation:  0.25 },
      ],
    },
  },

  rifle: {
    name: 'Shoot',
    duration: 0.6,
    loop: true,
    tracks: {
      // Hip-fire stance facing +X. Slight forward lean; rocks back on fire,
      // overshoots forward on recovery, settles.
      torso: [
        { time: 0.00, y:  0, rotation:  0.04 },
        { time: 0.03, y:  2, rotation: -0.05 },  // BANG — body rocks back
        { time: 0.18, y: -1, rotation:  0.07 },  // overshoot forward
        { time: 0.40, y:  0, rotation:  0.04 },  // settle
        { time: 0.60, y:  0, rotation:  0.04 },
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.03, rotation: -0.07 },         // hips absorb impulse
        { time: 0.30, rotation:  0.00 },
        { time: 0.60, rotation:  0.00 },
      ],
      head: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.05, rotation:  0.05 },         // jolts back briefly
        { time: 0.30, rotation: -0.02 },         // refocuses on target
        { time: 0.60, rotation:  0.00 },
      ],

      // Right arm (trigger hand) — upper arm hangs at side, forearm bent
      // ~90° forward to grip. World rotations: arm ≈ -0.50 (vertical down),
      // forearm ≈ -1.63 (horizontal +X).
      right_arm: [
        { time: 0.00, rotation: 1.571 },
        { time: 0.03, rotation: 1.471 },         // arm kicks up with recoil
        { time: 0.25, rotation: 1.601 },         // slight overshoot down
        { time: 0.60, rotation: 1.571 },
      ],
      right_forearm: [
        { time: 0.00, rotation: -1.572 },
        { time: 0.03, rotation: -1.872 },        // muzzle rise — forearm whips up ~17°
        { time: 0.25, rotation: -1.502 },        // overshoot down
        { time: 0.60, rotation: -1.572 },
      ],
      right_hand: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.03, rotation:  0.25 },         // wrist snaps up on fire
        { time: 0.30, rotation:  0.00 },
        { time: 0.60, rotation:  0.00 },
      ],

      // Left arm (support hand) — extends forward and slightly down to the
      // foregrip. World ≈ -1.55 (forward at ~30° below horizontal). Forearm
      // continues straight along the barrel (no elbow bend).
      left_arm: [
        { time: 0.00, rotation: -2.360 },
        { time: 0.03, rotation: -2.260 },        // kicks up slightly
        { time: 0.25, rotation: -2.400 },        // overshoot down-forward
        { time: 0.60, rotation: -2.360 },
      ],
      left_forearm: [
        { time: 0.00, rotation:  0.000 },
        { time: 0.03, rotation: -0.150 },        // forearm lifts with recoil
        { time: 0.30, rotation:  0.030 },        // slight droop
        { time: 0.60, rotation:  0.000 },
      ],
      left_hand: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.03, rotation:  0.10 },
        { time: 0.30, rotation:  0.00 },
        { time: 0.60, rotation:  0.00 },
      ],

      // Legs: braced wide stance — static.
      left_leg:   [{ time: 0.0, rotation: -0.15 }, { time: 0.6, rotation: -0.15 }],
      left_shin:  [{ time: 0.0, rotation:  0.22 }, { time: 0.6, rotation:  0.22 }],
      left_foot:  [{ time: 0.0, rotation: -0.05 }, { time: 0.6, rotation: -0.05 }],
      right_leg:  [{ time: 0.0, rotation:  0.12 }, { time: 0.6, rotation:  0.12 }],
      right_shin: [{ time: 0.0, rotation:  0.25 }, { time: 0.6, rotation:  0.25 }],
      right_foot: [{ time: 0.0, rotation:  0.06 }, { time: 0.6, rotation:  0.06 }],
    },
  },

  full_auto: {
    name: 'Full Auto',
    duration: 0.12,  // rapid cyclic — ~500 RPM feel
    loop: true,
    tracks: {
      // Aggressive forward lean; whole body shakes from sustained fire
      torso: [
        { time: 0.00, y:  0, rotation:  0.12 },
        { time: 0.02, y:  2, rotation:  0.04 },  // jolts back on fire
        { time: 0.07, y: -1, rotation:  0.14 },  // rebounds forward
        { time: 0.12, y:  0, rotation:  0.12 },
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.06 },
        { time: 0.02, rotation: -0.10 },  // hips absorb impulse
        { time: 0.07, rotation:  0.08 },
        { time: 0.12, rotation:  0.06 },
      ],
      // Head lags body — snaps back then re-acquires
      head: [
        { time: 0.00, rotation:  0.08 },
        { time: 0.03, rotation:  0.18 },
        { time: 0.09, rotation:  0.05 },
        { time: 0.12, rotation:  0.08 },
      ],
      // Right arm (trigger hand) — low hip, hard muzzle kick each cycle
      right_arm: [
        { time: 0.00, rotation: 1.719 },
        { time: 0.02, rotation: 1.449 },  // muzzle kicks up
        { time: 0.07, rotation: 1.749 },
        { time: 0.12, rotation: 1.719 },
      ],
      right_forearm: [
        { time: 0.00, rotation: -1.188 },
        { time: 0.02, rotation: -1.418 },
        { time: 0.07, rotation: -1.158 },
        { time: 0.12, rotation: -1.188 },
      ],
      right_hand: [
        { time: 0.00, rotation: -0.15 },
        { time: 0.02, rotation:  0.10 },  // wrist whips from recoil
        { time: 0.07, rotation: -0.18 },
        { time: 0.12, rotation: -0.15 },
      ],
      // Left arm (support hand) — grips barrel low, follows the kick
      left_arm: [
        { time: 0.00, rotation: -1.523 },
        { time: 0.02, rotation: -1.753 },
        { time: 0.07, rotation: -1.493 },
        { time: 0.12, rotation: -1.523 },
      ],
      left_forearm: [
        { time: 0.00, rotation: -1.058 },
        { time: 0.02, rotation: -1.258 },
        { time: 0.07, rotation: -1.038 },
        { time: 0.12, rotation: -1.058 },
      ],
      left_hand: [
        { time: 0.00, rotation: -0.10 },
        { time: 0.02, rotation: -0.20 },
        { time: 0.07, rotation: -0.08 },
        { time: 0.12, rotation: -0.10 },
      ],
      // Wide, deeply-bent combat stance to absorb sustained recoil
      left_leg:   [{ time: 0.0, rotation: -0.22 }, { time: 0.12, rotation: -0.22 }],
      left_shin:  [{ time: 0.0, rotation:  0.35 }, { time: 0.12, rotation:  0.35 }],
      left_foot:  [{ time: 0.0, rotation: -0.08 }, { time: 0.12, rotation: -0.08 }],
      right_leg:  [{ time: 0.0, rotation:  0.18 }, { time: 0.12, rotation:  0.18 }],
      right_shin: [{ time: 0.0, rotation:  0.36 }, { time: 0.12, rotation:  0.36 }],
      right_foot: [{ time: 0.0, rotation:  0.08 }, { time: 0.12, rotation:  0.08 }],
    },
  },

  // ── Rifle weapon animations ───────────────────────────────────────────────────

  rifle_idle: {
    name: 'Idle',
    duration: 2.0,
    loop: true,
    tracks: {
      torso: [
        { time: 0.0, y: 0,  rotation: 0.06 },
        { time: 1.0, y: -2, rotation: 0.07 },
        { time: 2.0, y: 0,  rotation: 0.06 },
      ],
      lower_torso: [
        { time: 0.0, y: 0 },
        { time: 1.0, y: -1 },
        { time: 2.0, y: 0 },
      ],
      head: [
        { time: 0.0, rotation: -0.02 },
        { time: 1.5, rotation:  0.01 },
        { time: 2.0, rotation: -0.02 },
      ],
      right_arm:    [{ time: 0.0, rotation: 1.35 }, { time: 1.0, rotation: 1.32 }, { time: 2.0, rotation: 1.35 }],
      right_forearm:[{ time: 0.0, rotation:-1.50 }, { time: 1.0, rotation:-1.47 }, { time: 2.0, rotation:-1.50 }],
      right_hand:   [{ time: 0.0, rotation: 0.00 }, { time: 2.0, rotation: 0.00 }],
      left_arm:     [{ time: 0.0, rotation:-2.20 }, { time: 1.0, rotation:-2.22 }, { time: 2.0, rotation:-2.20 }],
      left_forearm: [{ time: 0.0, rotation: 0.10 }, { time: 1.0, rotation: 0.08 }, { time: 2.0, rotation: 0.10 }],
      left_hand:    [{ time: 0.0, rotation: 0.00 }, { time: 2.0, rotation: 0.00 }],
      left_shin:    [{ time: 0.0, rotation: 0.10 }, { time: 1.0, rotation: 0.12 }, { time: 2.0, rotation: 0.10 }],
      right_shin:   [{ time: 0.0, rotation: 0.10 }, { time: 1.0, rotation: 0.12 }, { time: 2.0, rotation: 0.10 }],
      left_foot:    [{ time: 0.0, rotation: 0.05 }, { time: 2.0, rotation: 0.05 }],
      right_foot:   [{ time: 0.0, rotation: 0.05 }, { time: 2.0, rotation: 0.05 }],
    },
  },

  // Walk while firing — designed for seamless game-side transitions between
  // rifle_walk and rifle_walk_shoot. Every keyframe time AND value present in
  // rifle_walk is preserved verbatim here, so swapping animations at any walk
  // keyframe (t=0.00, 0.18, 0.36, 0.54, 0.72) produces zero pose pop. The
  // recoil pulse fires BETWEEN walk keyframes (peak at t=0.09, recovered by
  // t=0.18) using the same arm/forearm/hand magnitudes as `rifle` (Shoot).
  rifle_walk_shoot: {
    name: 'Walk Shoot',
    duration: 0.72,
    loop: true,
    tracks: {
      // All four walk keyframes preserved; pulse lives between 0.00 and 0.18.
      torso: [
        { time: 0.00, y:  0, rotation:  0.10 },
        { time: 0.09, y: -3, rotation:  0.05 },   // BANG — body rocks back
        { time: 0.14, y: -5, rotation:  0.14 },   // forward overshoot
        { time: 0.18, y: -6, rotation:  0.12 },   // walk keyframe
        { time: 0.36, y:  0, rotation:  0.10 },   // walk keyframe
        { time: 0.54, y: -6, rotation:  0.12 },   // walk keyframe
        { time: 0.72, y:  0, rotation:  0.10 },   // walk keyframe
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.14 },          // walk keyframe
        { time: 0.09, rotation: -0.03 },          // hips absorb
        { time: 0.18, rotation:  0.00 },          // walk keyframe
        { time: 0.36, rotation: -0.14 },          // walk keyframe
        { time: 0.54, rotation:  0.00 },          // walk keyframe
        { time: 0.72, rotation:  0.14 },          // walk keyframe
      ],
      head: [
        { time: 0.00, rotation: -0.04 },          // walk keyframe
        { time: 0.09, rotation:  0.03 },          // jolts back briefly
        { time: 0.18, rotation: -0.02 },          // mid-recovery
        { time: 0.22, rotation:  0.01 },          // walk keyframe
        { time: 0.36, rotation: -0.04 },          // walk keyframe
        { time: 0.58, rotation:  0.01 },          // walk keyframe
        { time: 0.72, rotation: -0.04 },          // walk keyframe
      ],
      // Trigger arm — walk's 1.35/1.32 baseline, recoil spike at t=0.09.
      right_arm: [
        { time: 0.00, rotation:  1.35 },          // walk keyframe
        { time: 0.07, rotation:  1.33 },          // pre-shot (~walk interp)
        { time: 0.09, rotation:  1.23 },          // kick up by ~0.10 (matches `rifle` shoot magnitude)
        { time: 0.14, rotation:  1.36 },          // overshoot down
        { time: 0.18, rotation:  1.32 },          // walk keyframe
        { time: 0.36, rotation:  1.35 },          // walk keyframe
        { time: 0.54, rotation:  1.32 },          // walk keyframe
        { time: 0.72, rotation:  1.35 },          // walk keyframe
      ],
      right_forearm: [
        { time: 0.00, rotation: -1.50 },          // walk keyframe
        { time: 0.07, rotation: -1.48 },
        { time: 0.09, rotation: -1.78 },          // muzzle rise (matches `rifle` -0.30 kick)
        { time: 0.14, rotation: -1.45 },          // overshoot down
        { time: 0.18, rotation: -1.47 },          // walk keyframe
        { time: 0.36, rotation: -1.50 },          // walk keyframe
        { time: 0.54, rotation: -1.47 },          // walk keyframe
        { time: 0.72, rotation: -1.50 },          // walk keyframe
      ],
      right_hand: [
        { time: 0.00, rotation:  0.00 },          // walk keyframe (same value)
        { time: 0.09, rotation:  0.22 },          // wrist snaps up
        { time: 0.18, rotation:  0.00 },          // back to walk pose
        { time: 0.72, rotation:  0.00 },          // walk keyframe
      ],
      // Support arm — walk baseline with a brief lift during recoil.
      left_arm: [
        { time: 0.00, rotation: -2.20 },          // walk keyframe
        { time: 0.09, rotation: -2.10 },          // lifts with recoil
        { time: 0.14, rotation: -2.23 },
        { time: 0.18, rotation: -2.22 },          // walk keyframe
        { time: 0.36, rotation: -2.20 },          // walk keyframe
        { time: 0.54, rotation: -2.22 },          // walk keyframe
        { time: 0.72, rotation: -2.20 },          // walk keyframe
      ],
      left_forearm: [
        { time: 0.00, rotation:  0.10 },          // walk keyframe
        { time: 0.09, rotation: -0.05 },          // forearm lifts with recoil
        { time: 0.14, rotation:  0.10 },          // back near walk
        { time: 0.18, rotation:  0.08 },          // walk keyframe
        { time: 0.36, rotation:  0.10 },          // walk keyframe
        { time: 0.54, rotation:  0.08 },          // walk keyframe
        { time: 0.72, rotation:  0.10 },          // walk keyframe
      ],
      left_hand: [
        { time: 0.00, rotation:  0.00 },          // walk keyframe (same value)
        { time: 0.09, rotation:  0.10 },
        { time: 0.18, rotation:  0.00 },
        { time: 0.72, rotation:  0.00 },          // walk keyframe
      ],
      // Legs / shins / feet — copied verbatim from rifle_walk so the stride
      // is identical. No shoot pulse here — recoil only touches the upper body.
      left_leg:  [{ time: 0.00, rotation:-0.42 }, { time: 0.36, rotation: 0.42 }, { time: 0.72, rotation:-0.42 }],
      left_shin: [{ time: 0.00, rotation:0.10 }, { time: 0.18, rotation:0.08 }, { time: 0.36, rotation:0.18 }, { time: 0.54, rotation:0.65 }, { time: 0.72, rotation:0.10 }],
      left_foot: [{ time: 0.00, rotation:-0.22 }, { time: 0.18, rotation:0.00 }, { time: 0.36, rotation:0.30 }, { time: 0.54, rotation:-0.10 }, { time: 0.72, rotation:-0.22 }],
      right_leg:  [{ time: 0.00, rotation: 0.42 }, { time: 0.36, rotation:-0.42 }, { time: 0.72, rotation: 0.42 }],
      right_shin: [{ time: 0.00, rotation:0.18 }, { time: 0.18, rotation:0.65 }, { time: 0.36, rotation:0.10 }, { time: 0.54, rotation:0.08 }, { time: 0.72, rotation:0.18 }],
      right_foot: [{ time: 0.00, rotation:0.30 }, { time: 0.18, rotation:-0.10 }, { time: 0.36, rotation:-0.22 }, { time: 0.54, rotation:0.00 }, { time: 0.72, rotation:0.30 }],
    },
  },

  rifle_walk: {
    name: 'Walk',
    duration: 0.72,
    loop: true,
    tracks: {
      torso: [
        { time: 0.00, y:  0, rotation: 0.10 },
        { time: 0.18, y: -6, rotation: 0.12 },
        { time: 0.36, y:  0, rotation: 0.10 },
        { time: 0.54, y: -6, rotation: 0.12 },
        { time: 0.72, y:  0, rotation: 0.10 },
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.14 },
        { time: 0.18, rotation:  0.00 },
        { time: 0.36, rotation: -0.14 },
        { time: 0.54, rotation:  0.00 },
        { time: 0.72, rotation:  0.14 },
      ],
      head: [
        { time: 0.00, rotation: -0.04 },
        { time: 0.22, rotation:  0.01 },
        { time: 0.36, rotation: -0.04 },
        { time: 0.58, rotation:  0.01 },
        { time: 0.72, rotation: -0.04 },
      ],
      right_arm:    [{ time: 0.00, rotation: 1.35 }, { time: 0.18, rotation: 1.32 }, { time: 0.36, rotation: 1.35 }, { time: 0.54, rotation: 1.32 }, { time: 0.72, rotation: 1.35 }],
      right_forearm:[{ time: 0.00, rotation:-1.50 }, { time: 0.18, rotation:-1.47 }, { time: 0.36, rotation:-1.50 }, { time: 0.54, rotation:-1.47 }, { time: 0.72, rotation:-1.50 }],
      right_hand:   [{ time: 0.0, rotation: 0.00 }, { time: 0.72, rotation: 0.00 }],
      left_arm:     [{ time: 0.00, rotation:-2.20 }, { time: 0.18, rotation:-2.22 }, { time: 0.36, rotation:-2.20 }, { time: 0.54, rotation:-2.22 }, { time: 0.72, rotation:-2.20 }],
      left_forearm: [{ time: 0.00, rotation: 0.10 }, { time: 0.18, rotation: 0.08 }, { time: 0.36, rotation: 0.10 }, { time: 0.54, rotation: 0.08 }, { time: 0.72, rotation: 0.10 }],
      left_hand:    [{ time: 0.0, rotation: 0.00 }, { time: 0.72, rotation: 0.00 }],
      left_leg:  [{ time: 0.00, rotation:-0.42 }, { time: 0.36, rotation: 0.42 }, { time: 0.72, rotation:-0.42 }],
      left_shin: [{ time: 0.00, rotation:0.10 }, { time: 0.18, rotation:0.08 }, { time: 0.36, rotation:0.18 }, { time: 0.54, rotation:0.65 }, { time: 0.72, rotation:0.10 }],
      left_foot: [{ time: 0.00, rotation:-0.22 }, { time: 0.18, rotation:0.00 }, { time: 0.36, rotation:0.30 }, { time: 0.54, rotation:-0.10 }, { time: 0.72, rotation:-0.22 }],
      right_leg:  [{ time: 0.00, rotation: 0.42 }, { time: 0.36, rotation:-0.42 }, { time: 0.72, rotation: 0.42 }],
      right_shin: [{ time: 0.00, rotation:0.18 }, { time: 0.18, rotation:0.65 }, { time: 0.36, rotation:0.10 }, { time: 0.54, rotation:0.08 }, { time: 0.72, rotation:0.18 }],
      right_foot: [{ time: 0.00, rotation:0.30 }, { time: 0.18, rotation:-0.10 }, { time: 0.36, rotation:-0.22 }, { time: 0.54, rotation:0.00 }, { time: 0.72, rotation:0.30 }],
    },
  },

  rifle_run: {
    name: 'Run',
    duration: 0.45,
    loop: true,
    tracks: {
      torso: [
        { time: 0.000, y:  0,  rotation: 0.20 },
        { time: 0.113, y: -10, rotation: 0.22 },
        { time: 0.225, y:  0,  rotation: 0.20 },
        { time: 0.338, y: -10, rotation: 0.22 },
        { time: 0.450, y:  0,  rotation: 0.20 },
      ],
      lower_torso: [
        { time: 0.000, rotation:  0.18 },
        { time: 0.113, rotation:  0.00 },
        { time: 0.225, rotation: -0.18 },
        { time: 0.338, rotation:  0.00 },
        { time: 0.450, rotation:  0.18 },
      ],
      head: [
        { time: 0.000, rotation: -0.06 },
        { time: 0.140, rotation:  0.01 },
        { time: 0.225, rotation: -0.06 },
        { time: 0.365, rotation:  0.01 },
        { time: 0.450, rotation: -0.06 },
      ],
      right_arm:    [{ time: 0.000, rotation: 1.30 }, { time: 0.113, rotation: 1.27 }, { time: 0.225, rotation: 1.30 }, { time: 0.338, rotation: 1.27 }, { time: 0.450, rotation: 1.30 }],
      right_forearm:[{ time: 0.000, rotation:-1.45 }, { time: 0.113, rotation:-1.42 }, { time: 0.225, rotation:-1.45 }, { time: 0.338, rotation:-1.42 }, { time: 0.450, rotation:-1.45 }],
      right_hand:   [{ time: 0.0, rotation: 0.00 }, { time: 0.45, rotation: 0.00 }],
      left_arm:     [{ time: 0.000, rotation:-2.15 }, { time: 0.113, rotation:-2.18 }, { time: 0.225, rotation:-2.15 }, { time: 0.338, rotation:-2.18 }, { time: 0.450, rotation:-2.15 }],
      left_forearm: [{ time: 0.000, rotation: 0.12 }, { time: 0.113, rotation: 0.10 }, { time: 0.225, rotation: 0.12 }, { time: 0.338, rotation: 0.10 }, { time: 0.450, rotation: 0.12 }],
      left_hand:    [{ time: 0.0, rotation: 0.00 }, { time: 0.45, rotation: 0.00 }],
      left_leg:  [{ time: 0.000, rotation:-0.60 }, { time: 0.225, rotation: 0.60 }, { time: 0.450, rotation:-0.60 }],
      left_shin: [{ time: 0.000, rotation:0.12 }, { time: 0.113, rotation:0.10 }, { time: 0.225, rotation:0.22 }, { time: 0.338, rotation:0.82 }, { time: 0.450, rotation:0.12 }],
      left_foot: [{ time: 0.000, rotation:-0.28 }, { time: 0.113, rotation:0.00 }, { time: 0.225, rotation:0.40 }, { time: 0.338, rotation:-0.14 }, { time: 0.450, rotation:-0.28 }],
      right_leg:  [{ time: 0.000, rotation: 0.60 }, { time: 0.225, rotation:-0.60 }, { time: 0.450, rotation: 0.60 }],
      right_shin: [{ time: 0.000, rotation:0.22 }, { time: 0.113, rotation:0.82 }, { time: 0.225, rotation:0.12 }, { time: 0.338, rotation:0.10 }, { time: 0.450, rotation:0.22 }],
      right_foot: [{ time: 0.000, rotation:0.40 }, { time: 0.113, rotation:-0.14 }, { time: 0.225, rotation:-0.28 }, { time: 0.338, rotation:0.00 }, { time: 0.450, rotation:0.40 }],
    },
  },

  // ── Sword weapon animations ───────────────────────────────────────────────────

  sword_idle: {
    name: 'Idle',
    duration: 2.0,
    loop: true,
    tracks: {
      // Alert forward lean — fighter ready to engage
      torso: [
        { time: 0.0, y: 0,  rotation: 0.08 },
        { time: 1.0, y: -2, rotation: 0.09 },
        { time: 2.0, y: 0,  rotation: 0.08 },
      ],
      lower_torso: [
        { time: 0.0, y: 0 },
        { time: 1.0, y: -1 },
        { time: 2.0, y: 0 },
      ],
      // Head slightly forward — scanning for threats
      head: [
        { time: 0.0, rotation: -0.06 },
        { time: 1.2, rotation: -0.03 },
        { time: 2.0, rotation: -0.06 },
      ],
      // Sword arm lowered — elbow bent, blade angled upward at waist level
      right_arm:    [{ time: 0.0, rotation: 0.70 }, { time: 1.0, rotation: 0.67 }, { time: 2.0, rotation: 0.70 }],
      right_forearm:[{ time: 0.0, rotation:-0.55 }, { time: 1.0, rotation:-0.52 }, { time: 2.0, rotation:-0.55 }],
      right_hand:   [{ time: 0.0, rotation: 0.05 }, { time: 2.0, rotation: 0.05 }],
      // Left arm hanging relaxed at hip
      left_arm:     [{ time: 0.0, rotation:-1.52 }, { time: 1.0, rotation:-1.55 }, { time: 2.0, rotation:-1.52 }],
      left_forearm: [{ time: 0.0, rotation:-0.12 }, { time: 1.0, rotation:-0.10 }, { time: 2.0, rotation:-0.12 }],
      left_hand:    [{ time: 0.0, rotation: 0.00 }, { time: 2.0, rotation: 0.00 }],
      // Fighting stance — feet shoulder-width apart, slight knee bend
      left_leg:     [{ time: 0.0, rotation:-0.15 }, { time: 2.0, rotation:-0.15 }],
      right_leg:    [{ time: 0.0, rotation: 0.15 }, { time: 2.0, rotation: 0.15 }],
      left_shin:    [{ time: 0.0, rotation: 0.14 }, { time: 1.0, rotation: 0.16 }, { time: 2.0, rotation: 0.14 }],
      right_shin:   [{ time: 0.0, rotation: 0.14 }, { time: 1.0, rotation: 0.16 }, { time: 2.0, rotation: 0.14 }],
      left_foot:    [{ time: 0.0, rotation:-0.05 }, { time: 2.0, rotation:-0.05 }],
      right_foot:   [{ time: 0.0, rotation: 0.05 }, { time: 2.0, rotation: 0.05 }],
    },
  },

  // Walk + Slash — designed for smooth transitions with sword_walk at the
  // cycle boundary (t=0 == t=0.72). Legs / feet / shins / lower_torso and the
  // torso's y-bounce are preserved verbatim from sword_walk so the stride is
  // identical. Upper-body bones play out a compressed version of sword_slash
  // (wind-up by t=0.16, impact at t=0.30, follow-through by t=0.42) and snap
  // back to sword_walk's start pose at t=0.72 for a clean loop.
  sword_walk_slash: {
    name: 'Walk Slash',
    duration: 0.72,
    loop: true,
    tracks: {
      // Walk's y-bounce kept (legs stride normally); rotation hybridizes
      // slash's wind-back-then-snap-forward across the cycle.
      torso: [
        { time: 0.00, y:  0, rotation:  0.06 },    // walk keyframe
        { time: 0.12, y: -4, rotation:  0.30 },    // wind back (slash-style)
        { time: 0.18, y: -6, rotation:  0.20 },    // walk y peak, still wound
        { time: 0.30, y: -2, rotation: -0.30 },    // SLASH — snap through
        { time: 0.36, y:  0, rotation: -0.10 },    // walk y zero, follow-through
        { time: 0.54, y: -6, rotation:  0.04 },    // walk y peak, settling
        { time: 0.72, y:  0, rotation:  0.06 },    // walk keyframe (loop)
      ],
      // Lower torso — walk's sway preserved verbatim.
      lower_torso: [
        { time: 0.00, rotation:  0.14 },           // walk keyframe
        { time: 0.18, rotation:  0.00 },           // walk keyframe
        { time: 0.36, rotation: -0.14 },           // walk keyframe
        { time: 0.54, rotation:  0.00 },           // walk keyframe
        { time: 0.72, rotation:  0.14 },           // walk keyframe
      ],
      // Head looks back during wind-up, snaps forward with the slash.
      head: [
        { time: 0.00, rotation: -0.06 },           // walk keyframe
        { time: 0.15, rotation:  0.10 },           // looks back wind-up
        { time: 0.30, rotation: -0.18 },           // snaps forward with slash
        { time: 0.45, rotation: -0.10 },           // follow-through
        { time: 0.72, rotation: -0.06 },           // walk keyframe (loop)
      ],
      // Right (sword) arm — compressed slash motion. Start and end values are
      // sword_walk's en-garde (-0.78) so cycle-boundary transitions are clean.
      right_arm: [
        { time: 0.00, rotation: -0.78 },           // walk keyframe
        { time: 0.12, rotation: -2.12 },           // overhead wind-up
        { time: 0.16, rotation: -2.12 },           // hold (telegraph)
        { time: 0.30, rotation:  0.42 },           // SLASH — whips down toward +X
        { time: 0.42, rotation:  0.72 },           // follow-through past target
        { time: 0.55, rotation: -0.55 },           // start returning
        { time: 0.72, rotation: -0.78 },           // walk keyframe (loop)
      ],
      right_forearm: [
        { time: 0.00, rotation: -0.38 },           // walk keyframe
        { time: 0.12, rotation: -0.68 },           // coiled at overhead
        { time: 0.16, rotation: -0.68 },           // hold
        { time: 0.26, rotation:  0.18 },           // whips through impact
        { time: 0.42, rotation: -0.22 },           // follow-through
        { time: 0.72, rotation: -0.38 },           // walk keyframe (loop)
      ],
      right_hand: [
        { time: 0.00, rotation:  0.05 },           // walk keyframe (constant)
        { time: 0.12, rotation: -0.38 },           // grip braced overhead
        { time: 0.30, rotation:  0.42 },           // snaps through
        { time: 0.50, rotation:  0.15 },
        { time: 0.72, rotation:  0.05 },           // walk keyframe (loop)
      ],
      // Left (off-hand) arm — rises as counterweight when the right arm slashes.
      left_arm: [
        { time: 0.00, rotation: -1.52 },           // walk keyframe
        { time: 0.16, rotation: -1.15 },           // lifts during wind-up
        { time: 0.30, rotation: -0.55 },           // swings forward as counterweight
        { time: 0.50, rotation: -1.20 },           // settles back
        { time: 0.72, rotation: -1.52 },           // walk keyframe (loop)
      ],
      left_forearm: [
        { time: 0.00, rotation: -0.12 },           // walk keyframe
        { time: 0.16, rotation: -0.38 },
        { time: 0.30, rotation: -0.68 },
        { time: 0.50, rotation: -0.28 },
        { time: 0.72, rotation: -0.12 },           // walk keyframe (loop)
      ],
      left_hand: [
        { time: 0.00, rotation:  0.00 },           // walk keyframe (constant)
        { time: 0.72, rotation:  0.00 },           // walk keyframe (loop)
      ],
      // Legs / shins / feet — copied verbatim from sword_walk so the stride is
      // identical and seamlessly interchangeable with sword_walk mid-game.
      left_leg:  [{ time: 0.00, rotation:-0.42 }, { time: 0.36, rotation: 0.42 }, { time: 0.72, rotation:-0.42 }],
      left_shin: [{ time: 0.00, rotation:0.10 }, { time: 0.18, rotation:0.08 }, { time: 0.36, rotation:0.18 }, { time: 0.54, rotation:0.65 }, { time: 0.72, rotation:0.10 }],
      left_foot: [{ time: 0.00, rotation:-0.22 }, { time: 0.18, rotation:0.00 }, { time: 0.36, rotation:0.30 }, { time: 0.54, rotation:-0.10 }, { time: 0.72, rotation:-0.22 }],
      right_leg:  [{ time: 0.00, rotation: 0.42 }, { time: 0.36, rotation:-0.42 }, { time: 0.72, rotation: 0.42 }],
      right_shin: [{ time: 0.00, rotation:0.18 }, { time: 0.18, rotation:0.65 }, { time: 0.36, rotation:0.10 }, { time: 0.54, rotation:0.08 }, { time: 0.72, rotation:0.18 }],
      right_foot: [{ time: 0.00, rotation:0.30 }, { time: 0.18, rotation:-0.10 }, { time: 0.36, rotation:-0.22 }, { time: 0.54, rotation:0.00 }, { time: 0.72, rotation:0.30 }],
    },
  },

  sword_walk: {
    name: 'Walk',
    duration: 0.72,
    loop: true,
    tracks: {
      // Forward fighting lean maintained through the stride
      torso: [
        { time: 0.00, y:  0, rotation: 0.06 },
        { time: 0.18, y: -6, rotation: 0.08 },
        { time: 0.36, y:  0, rotation: 0.06 },
        { time: 0.54, y: -6, rotation: 0.08 },
        { time: 0.72, y:  0, rotation: 0.06 },
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.14 },
        { time: 0.18, rotation:  0.00 },
        { time: 0.36, rotation: -0.14 },
        { time: 0.54, rotation:  0.00 },
        { time: 0.72, rotation:  0.14 },
      ],
      // Head stays alert, slight nod from stride
      head: [
        { time: 0.00, rotation: -0.06 },
        { time: 0.22, rotation: -0.02 },
        { time: 0.36, rotation: -0.06 },
        { time: 0.58, rotation: -0.02 },
        { time: 0.72, rotation: -0.06 },
      ],
      // Sword arm: larger natural bob, stays in en-garde range
      right_arm:    [{ time: 0.00, rotation:-0.78 }, { time: 0.18, rotation:-0.70 }, { time: 0.36, rotation:-0.86 }, { time: 0.54, rotation:-0.70 }, { time: 0.72, rotation:-0.78 }],
      right_forearm:[{ time: 0.00, rotation:-0.38 }, { time: 0.18, rotation:-0.30 }, { time: 0.36, rotation:-0.46 }, { time: 0.54, rotation:-0.30 }, { time: 0.72, rotation:-0.38 }],
      right_hand:   [{ time: 0.0, rotation: 0.05 }, { time: 0.72, rotation: 0.05 }],
      // Left arm: natural swing counterweight from hip
      left_arm:     [{ time: 0.00, rotation:-1.52 }, { time: 0.18, rotation:-1.43 }, { time: 0.36, rotation:-1.62 }, { time: 0.54, rotation:-1.43 }, { time: 0.72, rotation:-1.52 }],
      left_forearm: [{ time: 0.00, rotation:-0.12 }, { time: 0.18, rotation:-0.06 }, { time: 0.36, rotation:-0.18 }, { time: 0.54, rotation:-0.06 }, { time: 0.72, rotation:-0.12 }],
      left_hand:    [{ time: 0.0, rotation: 0.00 }, { time: 0.72, rotation: 0.00 }],
      // Standard walk legs
      left_leg:  [{ time: 0.00, rotation:-0.42 }, { time: 0.36, rotation: 0.42 }, { time: 0.72, rotation:-0.42 }],
      left_shin: [{ time: 0.00, rotation:0.10 }, { time: 0.18, rotation:0.08 }, { time: 0.36, rotation:0.18 }, { time: 0.54, rotation:0.65 }, { time: 0.72, rotation:0.10 }],
      left_foot: [{ time: 0.00, rotation:-0.22 }, { time: 0.18, rotation:0.00 }, { time: 0.36, rotation:0.30 }, { time: 0.54, rotation:-0.10 }, { time: 0.72, rotation:-0.22 }],
      right_leg:  [{ time: 0.00, rotation: 0.42 }, { time: 0.36, rotation:-0.42 }, { time: 0.72, rotation: 0.42 }],
      right_shin: [{ time: 0.00, rotation:0.18 }, { time: 0.18, rotation:0.65 }, { time: 0.36, rotation:0.10 }, { time: 0.54, rotation:0.08 }, { time: 0.72, rotation:0.18 }],
      right_foot: [{ time: 0.00, rotation:0.30 }, { time: 0.18, rotation:-0.10 }, { time: 0.36, rotation:-0.22 }, { time: 0.54, rotation:0.00 }, { time: 0.72, rotation:0.30 }],
    },
  },

  sword_slash: {
    name: 'Slash',
    // Cycle = 0.85 s of slashing + ~1 s held in rest before repeating.
    // Keyframes only go to t=0.85; sampling past that clamps to the last
    // keyframe values, holding the rest stance until the next loop.
    duration: 1.85,
    loop: true,
    tracks: {
      // Torso: wind back CW → snap forward CCW → recover
      torso: [
        { time: 0.00, rotation:  0.08 },   // alert stance
        { time: 0.20, rotation:  0.44 },   // wind back
        { time: 0.35, rotation: -0.52 },   // SLASH — snap through
        { time: 0.48, rotation: -0.32 },   // follow-through
        { time: 0.85, rotation:  0.08 },   // recover
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.20, rotation:  0.22 },
        { time: 0.35, rotation: -0.30 },
        { time: 0.48, rotation: -0.18 },
        { time: 0.85, rotation:  0.00 },
      ],
      // Head: looks back during wind-up, snaps forward with the slash
      head: [
        { time: 0.00, rotation: -0.06 },
        { time: 0.20, rotation:  0.18 },
        { time: 0.35, rotation: -0.22 },
        { time: 0.55, rotation: -0.10 },
        { time: 0.85, rotation: -0.06 },
      ],
      // Right arm: en-garde → overhead (telegraphed) → slash snap → follow-through
      right_arm: [
        { time: 0.00, rotation: -0.78 },   // en-garde
        { time: 0.18, rotation: -2.12 },   // overhead — raise quickly
        { time: 0.22, rotation: -2.12 },   // hold one frame
        { time: 0.35, rotation:  0.42 },   // SLASH — whips down toward +X
        { time: 0.50, rotation:  0.72 },   // follow-through, arm swings past
        { time: 0.85, rotation: -0.78 },   // recover
      ],
      right_forearm: [
        { time: 0.00, rotation: -0.38 },
        { time: 0.18, rotation: -0.68 },   // coiled at overhead
        { time: 0.32, rotation:  0.18 },   // whips through impact
        { time: 0.50, rotation: -0.22 },
        { time: 0.85, rotation: -0.38 },
      ],
      right_hand: [
        { time: 0.00, rotation:  0.05 },
        { time: 0.18, rotation: -0.38 },   // grip braced overhead
        { time: 0.35, rotation:  0.42 },   // snaps through
        { time: 0.55, rotation:  0.15 },
        { time: 0.85, rotation:  0.05 },
      ],
      // Left arm: rises as counterbalance when right arm slashes down
      left_arm: [
        { time: 0.00, rotation: -1.52 },   // hip
        { time: 0.20, rotation: -1.15 },   // lifts slightly during wind-up
        { time: 0.35, rotation: -0.55 },   // swings forward as counterweight
        { time: 0.55, rotation: -1.20 },   // settles back
        { time: 0.85, rotation: -1.52 },
      ],
      left_forearm: [
        { time: 0.00, rotation: -0.12 },
        { time: 0.20, rotation: -0.38 },
        { time: 0.35, rotation: -0.68 },
        { time: 0.55, rotation: -0.28 },
        { time: 0.85, rotation: -0.12 },
      ],
      // Footwork: step into the blow for weight and commitment
      left_leg: [
        { time: 0.00, rotation: -0.15 },   // fighting stance
        { time: 0.20, rotation: -0.28 },   // load weight back
        { time: 0.35, rotation: -0.02 },   // step forward into slash
        { time: 0.85, rotation: -0.15 },
      ],
      right_leg: [
        { time: 0.00, rotation:  0.15 },
        { time: 0.20, rotation:  0.28 },   // push-off leg extends
        { time: 0.35, rotation:  0.10 },
        { time: 0.85, rotation:  0.15 },
      ],
      left_shin:  [{ time: 0.00, rotation: 0.14 }, { time: 0.20, rotation: 0.10 }, { time: 0.35, rotation: 0.22 }, { time: 0.85, rotation: 0.14 }],
      right_shin: [{ time: 0.00, rotation: 0.14 }, { time: 0.20, rotation: 0.38 }, { time: 0.35, rotation: 0.16 }, { time: 0.85, rotation: 0.14 }],
      left_foot:  [{ time: 0.00, rotation:-0.05 }, { time: 0.85, rotation:-0.05 }],
      right_foot: [{ time: 0.00, rotation: 0.05 }, { time: 0.85, rotation: 0.05 }],
    },
  },

  // ── Sword Jump ───────────────────────────────────────────────────────────────
  // Body/legs mirror the no-weapon Jump. Arms stay in the sword-stance pose so
  // the blade is held the whole flight, with a small lift at apex.
  sword_jump: {
    name: 'Jump',
    duration: 1.9,
    loop: true,
    tracks: {
      torso: [
        { time: 0.0,  y:   0, rotation: 0.08 },
        { time: 0.12, y:  26, rotation: 0.05 },   // crouch
        { time: 0.35, y: -88, rotation: 0.04 },   // apex
        { time: 0.58, y: -16, rotation: 0.06 },
        { time: 0.68, y:  16, rotation: 0.05 },   // land
        { time: 0.80, y:  -2, rotation: 0.07 },
        { time: 0.9,  y:   0, rotation: 0.08 },
      ],
      lower_torso: [
        { time: 0.0,  y:  0 },
        { time: 0.12, y:  6 },
        { time: 0.35, y: -6 },
        { time: 0.68, y:  4 },
        { time: 0.9,  y:  0 },
      ],
      head: [
        { time: 0.0,  rotation: -0.06 },
        { time: 0.35, rotation: -0.12 },          // looks up at apex
        { time: 0.68, rotation: -0.02 },
        { time: 0.9,  rotation: -0.06 },
      ],
      // Sword hand stays gripped; arm lifts slightly at apex then settles.
      right_arm: [
        { time: 0.0,  rotation: 0.70 },
        { time: 0.12, rotation: 0.80 },           // small drop on crouch
        { time: 0.35, rotation: 0.45 },           // lift sword at apex
        { time: 0.58, rotation: 0.60 },
        { time: 0.68, rotation: 0.78 },           // bounce on land
        { time: 0.9,  rotation: 0.70 },
      ],
      right_forearm: [
        { time: 0.0,  rotation:-0.55 },
        { time: 0.12, rotation:-0.45 },
        { time: 0.35, rotation:-0.70 },
        { time: 0.68, rotation:-0.45 },
        { time: 0.9,  rotation:-0.55 },
      ],
      right_hand: [
        { time: 0.0,  rotation: 0.05 },
        { time: 0.9,  rotation: 0.05 },
      ],
      // Off hand also lifts modestly to counterbalance.
      left_arm: [
        { time: 0.0,  rotation:-1.52 },
        { time: 0.12, rotation:-1.40 },
        { time: 0.35, rotation:-1.75 },
        { time: 0.68, rotation:-1.40 },
        { time: 0.9,  rotation:-1.52 },
      ],
      left_forearm: [
        { time: 0.0,  rotation:-0.12 },
        { time: 0.35, rotation:-0.25 },
        { time: 0.9,  rotation:-0.12 },
      ],
      left_hand: [
        { time: 0.0,  rotation: 0.00 },
        { time: 0.9,  rotation: 0.00 },
      ],
      left_leg: [
        { time: 0.0,  rotation:-0.15 },
        { time: 0.12, rotation:-0.50 },
        { time: 0.35, rotation:-0.65 },
        { time: 0.58, rotation: 0.00 },
        { time: 0.68, rotation:-0.40 },
        { time: 0.9,  rotation:-0.15 },
      ],
      right_leg: [
        { time: 0.0,  rotation: 0.15 },
        { time: 0.12, rotation: 0.50 },
        { time: 0.35, rotation: 0.65 },
        { time: 0.58, rotation: 0.00 },
        { time: 0.68, rotation: 0.40 },
        { time: 0.9,  rotation: 0.15 },
      ],
      left_shin: [
        { time: 0.0,  rotation: 0.14 },
        { time: 0.12, rotation: 0.65 },
        { time: 0.35, rotation: 0.10 },
        { time: 0.68, rotation: 0.55 },
        { time: 0.9,  rotation: 0.14 },
      ],
      right_shin: [
        { time: 0.0,  rotation: 0.14 },
        { time: 0.12, rotation: 0.65 },
        { time: 0.35, rotation: 0.10 },
        { time: 0.68, rotation: 0.55 },
        { time: 0.9,  rotation: 0.14 },
      ],
      left_foot: [
        { time: 0.0,  rotation:-0.05 },
        { time: 0.12, rotation:-0.20 },
        { time: 0.35, rotation: 0.35 },
        { time: 0.68, rotation: 0.10 },
        { time: 0.9,  rotation:-0.05 },
      ],
      right_foot: [
        { time: 0.0,  rotation: 0.05 },
        { time: 0.12, rotation:-0.20 },
        { time: 0.35, rotation: 0.35 },
        { time: 0.68, rotation: 0.10 },
        { time: 0.9,  rotation: 0.05 },
      ],
    },
  },

  // ── Rifle Jump ───────────────────────────────────────────────────────────────
  // Same body/legs as the base jump, but both hands stay glued to the rifle
  // (arm/forearm rotations match the rifle-idle stance with tiny variation).
  rifle_jump: {
    name: 'Jump',
    duration: 1.9,
    loop: true,
    tracks: {
      torso: [
        { time: 0.0,  y:   0, rotation: 0.10 },
        { time: 0.12, y:  26, rotation: 0.08 },
        { time: 0.35, y: -88, rotation: 0.06 },
        { time: 0.58, y: -16, rotation: 0.08 },
        { time: 0.68, y:  16, rotation: 0.07 },
        { time: 0.80, y:  -2, rotation: 0.09 },
        { time: 0.9,  y:   0, rotation: 0.10 },
      ],
      lower_torso: [
        { time: 0.0,  y:  0 },
        { time: 0.12, y:  6 },
        { time: 0.35, y: -6 },
        { time: 0.68, y:  4 },
        { time: 0.9,  y:  0 },
      ],
      head: [
        { time: 0.0,  rotation: -0.02 },
        { time: 0.35, rotation: -0.08 },          // glances up briefly
        { time: 0.68, rotation:  0.02 },
        { time: 0.9,  rotation: -0.02 },
      ],
      // Both hands hold the rifle throughout. Tiny rotation variation keeps it
      // from feeling stiff — but stays close to the idle stance values.
      right_arm: [
        { time: 0.0,  rotation: 1.35 },
        { time: 0.12, rotation: 1.40 },
        { time: 0.35, rotation: 1.25 },
        { time: 0.68, rotation: 1.42 },
        { time: 0.9,  rotation: 1.35 },
      ],
      right_forearm: [
        { time: 0.0,  rotation:-1.50 },
        { time: 0.35, rotation:-1.55 },
        { time: 0.9,  rotation:-1.50 },
      ],
      right_hand: [
        { time: 0.0,  rotation: 0.00 },
        { time: 0.9,  rotation: 0.00 },
      ],
      left_arm: [
        { time: 0.0,  rotation:-2.20 },
        { time: 0.12, rotation:-2.15 },
        { time: 0.35, rotation:-2.30 },
        { time: 0.68, rotation:-2.15 },
        { time: 0.9,  rotation:-2.20 },
      ],
      left_forearm: [
        { time: 0.0,  rotation: 0.10 },
        { time: 0.35, rotation: 0.05 },
        { time: 0.9,  rotation: 0.10 },
      ],
      left_hand: [
        { time: 0.0,  rotation: 0.00 },
        { time: 0.9,  rotation: 0.00 },
      ],
      left_leg: [
        { time: 0.0,  rotation:  0 },
        { time: 0.12, rotation: -0.35 },
        { time: 0.35, rotation: -0.5 },
        { time: 0.58, rotation:  0.1 },
        { time: 0.68, rotation: -0.25 },
        { time: 0.9,  rotation:  0 },
      ],
      right_leg: [
        { time: 0.0,  rotation:  0 },
        { time: 0.12, rotation:  0.35 },
        { time: 0.35, rotation:  0.5 },
        { time: 0.58, rotation: -0.1 },
        { time: 0.68, rotation:  0.25 },
        { time: 0.9,  rotation:  0 },
      ],
      left_shin: [
        { time: 0.0,  rotation: 0.10 },
        { time: 0.12, rotation: 0.65 },
        { time: 0.35, rotation: 0.10 },
        { time: 0.68, rotation: 0.55 },
        { time: 0.9,  rotation: 0.10 },
      ],
      right_shin: [
        { time: 0.0,  rotation: 0.10 },
        { time: 0.12, rotation: 0.65 },
        { time: 0.35, rotation: 0.10 },
        { time: 0.68, rotation: 0.55 },
        { time: 0.9,  rotation: 0.10 },
      ],
      left_foot: [
        { time: 0.0,  rotation:  0.05 },
        { time: 0.12, rotation: -0.20 },
        { time: 0.35, rotation:  0.35 },
        { time: 0.68, rotation:  0.10 },
        { time: 0.9,  rotation:  0.05 },
      ],
      right_foot: [
        { time: 0.0,  rotation:  0.05 },
        { time: 0.12, rotation: -0.20 },
        { time: 0.35, rotation:  0.35 },
        { time: 0.68, rotation:  0.10 },
        { time: 0.9,  rotation:  0.05 },
      ],
    },
  },

  // ── Rocket launcher animations ───────────────────────────────────────────────
  // Shoulder-fired heavy weapon. Forward lean to carry the weight; both hands
  // grip the launcher (trigger hand + forward support hand).

  rocket_idle: {
    name: 'Idle',
    duration: 2.0,
    loop: true,
    tracks: {
      torso: [
        { time: 0.0, y: 0,  rotation: 0.10 },          // strong forward lean
        { time: 1.0, y: -2, rotation: 0.11 },
        { time: 2.0, y: 0,  rotation: 0.10 },
      ],
      lower_torso: [
        { time: 0.0, y: 0 },
        { time: 1.0, y: -1 },
        { time: 2.0, y: 0 },
      ],
      head: [
        { time: 0.0, rotation: -0.04 },
        { time: 1.5, rotation:  0.00 },
        { time: 2.0, rotation: -0.04 },
      ],
      // Trigger hand on the pistol grip — similar to rifle but slightly
      // higher to support the launcher on the shoulder.
      right_arm:    [{ time: 0.0, rotation: 1.15 }, { time: 1.0, rotation: 1.13 }, { time: 2.0, rotation: 1.15 }],
      right_forearm:[{ time: 0.0, rotation:-1.45 }, { time: 1.0, rotation:-1.43 }, { time: 2.0, rotation:-1.45 }],
      right_hand:   [{ time: 0.0, rotation: 0.00 }, { time: 2.0, rotation: 0.00 }],
      // Support hand reaches forward to the front grip.
      left_arm:     [{ time: 0.0, rotation:-2.05 }, { time: 1.0, rotation:-2.07 }, { time: 2.0, rotation:-2.05 }],
      left_forearm: [{ time: 0.0, rotation:-0.20 }, { time: 1.0, rotation:-0.22 }, { time: 2.0, rotation:-0.20 }],
      left_hand:    [{ time: 0.0, rotation: 0.00 }, { time: 2.0, rotation: 0.00 }],
      // Wide braced stance to carry the weight.
      left_leg:     [{ time: 0.0, rotation:-0.16 }, { time: 2.0, rotation:-0.16 }],
      right_leg:    [{ time: 0.0, rotation: 0.16 }, { time: 2.0, rotation: 0.16 }],
      left_shin:    [{ time: 0.0, rotation: 0.18 }, { time: 1.0, rotation: 0.20 }, { time: 2.0, rotation: 0.18 }],
      right_shin:   [{ time: 0.0, rotation: 0.18 }, { time: 1.0, rotation: 0.20 }, { time: 2.0, rotation: 0.18 }],
      left_foot:    [{ time: 0.0, rotation:-0.05 }, { time: 2.0, rotation:-0.05 }],
      right_foot:   [{ time: 0.0, rotation: 0.05 }, { time: 2.0, rotation: 0.05 }],
    },
  },

  // Walk + Fire — designed for seamless game-side transitions with
  // rocket_walk. Walk keyframe values are preserved at t=0, 0.20, 0.40, 0.60,
  // 0.80 for every track, so swapping animations at any walk keyframe gives
  // zero pose pop. The recoil pulse fires BETWEEN walk keyframes (peak at
  // t=0.10, resolved by t=0.20) using a compressed version of rocket_fire's
  // backward shove.
  rocket_walk_fire: {
    name: 'Walk Fire',
    duration: 0.80,
    loop: true,
    tracks: {
      // Walk y-bounce preserved; big backward x-shove fits in [0.00, 0.20].
      torso: [
        { time: 0.00, x:   0, y:  0, rotation:  0.13 },   // walk keyframe
        { time: 0.10, x: -10, y: -2, rotation:  0.07 },   // BANG — body shoves back
        { time: 0.16, x:  -5, y: -3, rotation:  0.16 },   // forward overshoot
        { time: 0.20, x:   0, y: -4, rotation:  0.14 },   // walk keyframe (x reset)
        { time: 0.40, x:   0, y:  0, rotation:  0.13 },   // walk keyframe
        { time: 0.60, x:   0, y: -4, rotation:  0.14 },   // walk keyframe
        { time: 0.80, x:   0, y:  0, rotation:  0.13 },   // walk keyframe (loop)
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.10 },           // walk keyframe
        { time: 0.10, rotation: -0.04 },           // hips absorb the kick
        { time: 0.20, rotation:  0.00 },           // walk keyframe
        { time: 0.40, rotation: -0.10 },           // walk keyframe
        { time: 0.60, rotation:  0.00 },           // walk keyframe
        { time: 0.80, rotation:  0.10 },           // walk keyframe (loop)
      ],
      head: [
        { time: 0.00, rotation: -0.04 },           // walk keyframe
        { time: 0.12, rotation:  0.04 },           // jolts back briefly
        { time: 0.22, rotation: -0.05 },           // refocuses
        { time: 0.40, rotation: -0.06 },           // walk keyframe
        { time: 0.80, rotation: -0.04 },           // walk keyframe (loop)
      ],
      // Trigger arm — walk baseline (1.15/1.13) + small upward kick on fire.
      right_arm: [
        { time: 0.00, rotation:  1.15 },           // walk keyframe
        { time: 0.08, rotation:  1.14 },           // pre-shot (walk interp)
        { time: 0.10, rotation:  1.05 },           // kicks up (matches rocket_fire magnitude)
        { time: 0.15, rotation:  1.18 },           // overshoot down
        { time: 0.20, rotation:  1.14 },           // walk-matched (lerp at 0.20)
        { time: 0.40, rotation:  1.13 },           // walk keyframe
        { time: 0.60, rotation:  1.14 },           // walk-matched
        { time: 0.80, rotation:  1.15 },           // walk keyframe (loop)
      ],
      right_forearm: [
        { time: 0.00, rotation: -1.45 },           // walk keyframe
        { time: 0.08, rotation: -1.44 },
        { time: 0.10, rotation: -1.58 },           // muzzle ticks up
        { time: 0.15, rotation: -1.40 },           // overshoot down
        { time: 0.20, rotation: -1.44 },           // walk-matched
        { time: 0.40, rotation: -1.43 },           // walk keyframe
        { time: 0.60, rotation: -1.44 },           // walk-matched
        { time: 0.80, rotation: -1.45 },           // walk keyframe (loop)
      ],
      right_hand: [
        { time: 0.00, rotation:  0.00 },           // walk keyframe (constant)
        { time: 0.10, rotation:  0.12 },           // wrist snap from recoil
        { time: 0.20, rotation:  0.00 },           // back to walk
        { time: 0.80, rotation:  0.00 },           // walk keyframe (loop)
      ],
      // Support arm — braces against the backblast then settles.
      left_arm: [
        { time: 0.00, rotation: -2.05 },           // walk keyframe
        { time: 0.10, rotation: -2.00 },           // braces
        { time: 0.15, rotation: -2.07 },           // settle
        { time: 0.20, rotation: -2.06 },           // walk-matched
        { time: 0.40, rotation: -2.07 },           // walk keyframe
        { time: 0.60, rotation: -2.06 },           // walk-matched
        { time: 0.80, rotation: -2.05 },           // walk keyframe (loop)
      ],
      left_forearm: [
        { time: 0.00, rotation: -0.20 },           // walk keyframe
        { time: 0.10, rotation: -0.32 },           // braces (matches rocket_fire)
        { time: 0.15, rotation: -0.18 },           // overshoot back
        { time: 0.20, rotation: -0.21 },           // walk-matched
        { time: 0.40, rotation: -0.22 },           // walk keyframe
        { time: 0.60, rotation: -0.21 },           // walk-matched
        { time: 0.80, rotation: -0.20 },           // walk keyframe (loop)
      ],
      left_hand: [
        { time: 0.00, rotation:  0.00 },           // walk keyframe (constant)
        { time: 0.80, rotation:  0.00 },           // walk keyframe (loop)
      ],
      // Legs / shins / feet — copied verbatim from rocket_walk so the stride
      // is identical and animations are mid-cycle interchangeable for the legs.
      left_leg:  [{ time: 0.00, rotation:-0.30 }, { time: 0.40, rotation: 0.30 }, { time: 0.80, rotation:-0.30 }],
      left_shin: [{ time: 0.00, rotation:0.14 }, { time: 0.20, rotation:0.12 }, { time: 0.40, rotation:0.20 }, { time: 0.60, rotation:0.55 }, { time: 0.80, rotation:0.14 }],
      left_foot: [{ time: 0.00, rotation:-0.15 }, { time: 0.20, rotation:0.00 }, { time: 0.40, rotation:0.20 }, { time: 0.60, rotation:-0.05 }, { time: 0.80, rotation:-0.15 }],
      right_leg:  [{ time: 0.00, rotation: 0.30 }, { time: 0.40, rotation:-0.30 }, { time: 0.80, rotation: 0.30 }],
      right_shin: [{ time: 0.00, rotation:0.20 }, { time: 0.20, rotation:0.55 }, { time: 0.40, rotation:0.14 }, { time: 0.60, rotation:0.12 }, { time: 0.80, rotation:0.20 }],
      right_foot: [{ time: 0.00, rotation:0.20 }, { time: 0.20, rotation:-0.05 }, { time: 0.40, rotation:-0.15 }, { time: 0.60, rotation:0.00 }, { time: 0.80, rotation:0.20 }],
    },
  },

  rocket_walk: {
    name: 'Walk',
    duration: 0.80,                         // slower than rifle walk — heavy weapon
    loop: true,
    tracks: {
      torso: [
        { time: 0.00, y:  0, rotation: 0.13 },
        { time: 0.20, y: -4, rotation: 0.14 },
        { time: 0.40, y:  0, rotation: 0.13 },
        { time: 0.60, y: -4, rotation: 0.14 },
        { time: 0.80, y:  0, rotation: 0.13 },
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.10 },
        { time: 0.20, rotation:  0.00 },
        { time: 0.40, rotation: -0.10 },
        { time: 0.60, rotation:  0.00 },
        { time: 0.80, rotation:  0.10 },
      ],
      head: [
        { time: 0.00, rotation: -0.04 },
        { time: 0.40, rotation: -0.06 },
        { time: 0.80, rotation: -0.04 },
      ],
      right_arm:    [{ time: 0.00, rotation: 1.15 }, { time: 0.40, rotation: 1.13 }, { time: 0.80, rotation: 1.15 }],
      right_forearm:[{ time: 0.00, rotation:-1.45 }, { time: 0.40, rotation:-1.43 }, { time: 0.80, rotation:-1.45 }],
      right_hand:   [{ time: 0.0, rotation: 0.00 }, { time: 0.80, rotation: 0.00 }],
      left_arm:     [{ time: 0.00, rotation:-2.05 }, { time: 0.40, rotation:-2.07 }, { time: 0.80, rotation:-2.05 }],
      left_forearm: [{ time: 0.00, rotation:-0.20 }, { time: 0.40, rotation:-0.22 }, { time: 0.80, rotation:-0.20 }],
      left_hand:    [{ time: 0.0, rotation: 0.00 }, { time: 0.80, rotation: 0.00 }],
      // Shorter, heavier stride.
      left_leg:  [{ time: 0.00, rotation:-0.30 }, { time: 0.40, rotation: 0.30 }, { time: 0.80, rotation:-0.30 }],
      left_shin: [{ time: 0.00, rotation:0.14 }, { time: 0.20, rotation:0.12 }, { time: 0.40, rotation:0.20 }, { time: 0.60, rotation:0.55 }, { time: 0.80, rotation:0.14 }],
      left_foot: [{ time: 0.00, rotation:-0.15 }, { time: 0.20, rotation:0.00 }, { time: 0.40, rotation:0.20 }, { time: 0.60, rotation:-0.05 }, { time: 0.80, rotation:-0.15 }],
      right_leg:  [{ time: 0.00, rotation: 0.30 }, { time: 0.40, rotation:-0.30 }, { time: 0.80, rotation: 0.30 }],
      right_shin: [{ time: 0.00, rotation:0.20 }, { time: 0.20, rotation:0.55 }, { time: 0.40, rotation:0.14 }, { time: 0.60, rotation:0.12 }, { time: 0.80, rotation:0.20 }],
      right_foot: [{ time: 0.00, rotation:0.20 }, { time: 0.20, rotation:-0.05 }, { time: 0.40, rotation:-0.15 }, { time: 0.60, rotation:0.00 }, { time: 0.80, rotation:0.20 }],
    },
  },

  rocket_fire: {
    name: 'Fire',
    duration: 1.6,                          // long single shot — slow reload feel
    loop: true,
    tracks: {
      // Aim → TRIGGER → big backward shove → recover → settle. The rocket has
      // hefty back-blast: torso slams back along -X by ~14 then drifts forward.
      torso: [
        { time: 0.00, x:   0, y:  0, rotation:  0.13 },   // aim
        { time: 0.08, x: -14, y:  0, rotation:  0.05 },   // FIRE — body shoves back
        { time: 0.25, x:  -8, y:  0, rotation:  0.10 },   // still pushed back
        { time: 0.45, x:   2, y:  0, rotation:  0.15 },   // forward overshoot
        { time: 0.70, x:   0, y:  0, rotation:  0.13 },   // settle
        { time: 1.60, x:   0, y:  0, rotation:  0.13 },   // hold until next loop
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.10 },
        { time: 0.08, rotation: -0.06 },   // hips absorb the kick
        { time: 0.35, rotation:  0.10 },
        { time: 1.60, rotation:  0.10 },
      ],
      head: [
        { time: 0.00, rotation: -0.04 },
        { time: 0.12, rotation:  0.04 },   // jolts back briefly
        { time: 0.35, rotation: -0.06 },   // refocuses
        { time: 1.60, rotation: -0.04 },
      ],
      // Trigger arm — small upward kick on fire, settles.
      right_arm:    [
        { time: 0.00, rotation: 1.15 },
        { time: 0.08, rotation: 1.05 },
        { time: 0.30, rotation: 1.18 },
        { time: 1.60, rotation: 1.15 },
      ],
      right_forearm:[
        { time: 0.00, rotation:-1.45 },
        { time: 0.08, rotation:-1.58 },    // muzzle ticks up slightly
        { time: 0.30, rotation:-1.42 },
        { time: 1.60, rotation:-1.45 },
      ],
      right_hand:   [{ time: 0.0, rotation: 0.00 }, { time: 0.08, rotation: 0.12 }, { time: 0.40, rotation: 0.00 }, { time: 1.60, rotation: 0.00 }],
      // Support arm bracing for backblast.
      left_arm:     [
        { time: 0.00, rotation:-2.05 },
        { time: 0.08, rotation:-2.00 },
        { time: 0.30, rotation:-2.08 },
        { time: 1.60, rotation:-2.05 },
      ],
      left_forearm: [
        { time: 0.00, rotation:-0.20 },
        { time: 0.08, rotation:-0.32 },
        { time: 0.30, rotation:-0.18 },
        { time: 1.60, rotation:-0.20 },
      ],
      left_hand:    [{ time: 0.0, rotation: 0.00 }, { time: 1.60, rotation: 0.00 }],
      // Wide braced stance (legs absorb the kick).
      left_leg:   [{ time: 0.0, rotation:-0.16 }, { time: 0.08, rotation:-0.22 }, { time: 0.40, rotation:-0.16 }, { time: 1.6, rotation:-0.16 }],
      left_shin:  [{ time: 0.0, rotation: 0.18 }, { time: 0.08, rotation: 0.32 }, { time: 0.40, rotation: 0.18 }, { time: 1.6, rotation: 0.18 }],
      left_foot:  [{ time: 0.0, rotation:-0.05 }, { time: 1.6, rotation:-0.05 }],
      right_leg:  [{ time: 0.0, rotation: 0.16 }, { time: 0.08, rotation: 0.22 }, { time: 0.40, rotation: 0.16 }, { time: 1.6, rotation: 0.16 }],
      right_shin: [{ time: 0.0, rotation: 0.18 }, { time: 0.08, rotation: 0.32 }, { time: 0.40, rotation: 0.18 }, { time: 1.6, rotation: 0.18 }],
      right_foot: [{ time: 0.0, rotation: 0.05 }, { time: 1.6, rotation: 0.05 }],
    },
  },

  rocket_jump: {
    name: 'Jump',
    duration: 1.9,
    loop: true,
    tracks: {
      torso: [
        { time: 0.0,  y:   0, rotation: 0.13 },
        { time: 0.12, y:  26, rotation: 0.10 },
        { time: 0.35, y: -88, rotation: 0.08 },
        { time: 0.58, y: -16, rotation: 0.11 },
        { time: 0.68, y:  16, rotation: 0.10 },
        { time: 0.80, y:  -2, rotation: 0.12 },
        { time: 0.9,  y:   0, rotation: 0.13 },
      ],
      lower_torso: [
        { time: 0.0,  y:  0 },
        { time: 0.12, y:  6 },
        { time: 0.35, y: -6 },
        { time: 0.68, y:  4 },
        { time: 0.9,  y:  0 },
      ],
      head: [
        { time: 0.0,  rotation: -0.04 },
        { time: 0.35, rotation: -0.10 },
        { time: 0.68, rotation:  0.00 },
        { time: 0.9,  rotation: -0.04 },
      ],
      right_arm:    [{ time: 0.0, rotation: 1.15 }, { time: 0.35, rotation: 1.05 }, { time: 0.68, rotation: 1.20 }, { time: 0.9, rotation: 1.15 }],
      right_forearm:[{ time: 0.0, rotation:-1.45 }, { time: 0.35, rotation:-1.55 }, { time: 0.9, rotation:-1.45 }],
      right_hand:   [{ time: 0.0, rotation: 0.00 }, { time: 0.9, rotation: 0.00 }],
      left_arm:     [{ time: 0.0, rotation:-2.05 }, { time: 0.35, rotation:-2.15 }, { time: 0.68, rotation:-2.00 }, { time: 0.9, rotation:-2.05 }],
      left_forearm: [{ time: 0.0, rotation:-0.20 }, { time: 0.35, rotation:-0.28 }, { time: 0.9, rotation:-0.20 }],
      left_hand:    [{ time: 0.0, rotation: 0.00 }, { time: 0.9, rotation: 0.00 }],
      left_leg:  [{ time: 0.0, rotation:-0.16 }, { time: 0.12, rotation:-0.45 }, { time: 0.35, rotation:-0.55 }, { time: 0.58, rotation: 0.00 }, { time: 0.68, rotation:-0.30 }, { time: 0.9, rotation:-0.16 }],
      right_leg: [{ time: 0.0, rotation: 0.16 }, { time: 0.12, rotation: 0.45 }, { time: 0.35, rotation: 0.55 }, { time: 0.58, rotation: 0.00 }, { time: 0.68, rotation: 0.30 }, { time: 0.9, rotation: 0.16 }],
      left_shin: [{ time: 0.0, rotation: 0.18 }, { time: 0.12, rotation: 0.65 }, { time: 0.35, rotation: 0.10 }, { time: 0.68, rotation: 0.55 }, { time: 0.9, rotation: 0.18 }],
      right_shin:[{ time: 0.0, rotation: 0.18 }, { time: 0.12, rotation: 0.65 }, { time: 0.35, rotation: 0.10 }, { time: 0.68, rotation: 0.55 }, { time: 0.9, rotation: 0.18 }],
      left_foot: [{ time: 0.0, rotation:-0.05 }, { time: 0.12, rotation:-0.20 }, { time: 0.35, rotation: 0.35 }, { time: 0.68, rotation: 0.10 }, { time: 0.9, rotation:-0.05 }],
      right_foot:[{ time: 0.0, rotation: 0.05 }, { time: 0.12, rotation:-0.20 }, { time: 0.35, rotation: 0.35 }, { time: 0.68, rotation: 0.10 }, { time: 0.9, rotation: 0.05 }],
    },
  },

};

export const WEAPON_ANIMATION_SETS = {
  none:   ['idle', 'walk', 'run', 'scared_run', 'jump', 'punch', 'carry_walk'],
  sword:  ['sword_idle', 'sword_walk', 'sword_walk_slash', 'sword_slash', 'sword_jump'],
  rifle:  ['rifle_idle', 'rifle_walk', 'rifle_walk_shoot', 'rifle_run', 'rifle_jump', 'rifle', 'full_auto'],
  rocket: ['rocket_idle', 'rocket_walk', 'rocket_walk_fire', 'rocket_fire', 'rocket_jump'],
};

export const WEAPON_DEFAULT_ANIMATIONS = {
  none:   'idle',
  sword:  'sword_idle',
  rifle:  'rifle_idle',
  rocket: 'rocket_idle',
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function trackValueAt(keyframes, time, prop) {
  if (!keyframes || keyframes.length === 0) return 0;

  if (time <= keyframes[0].time) return keyframes[0][prop] ?? 0;
  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) return last[prop] ?? 0;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (time >= a.time && time <= b.time) {
      const t      = (time - a.time) / (b.time - a.time);
      const smooth = t * t * (3 - 2 * t);
      return lerp(a[prop] ?? 0, b[prop] ?? 0, smooth);
    }
  }

  return 0;
}

export function getPoseAtTime(animation, time) {
  const pose = {};
  for (const [boneId, keyframes] of Object.entries(animation.tracks)) {
    pose[boneId] = {
      x:        trackValueAt(keyframes, time, 'x'),
      y:        trackValueAt(keyframes, time, 'y'),
      rotation: trackValueAt(keyframes, time, 'rotation'),
    };
  }
  return pose;
}

/**
 * Time keys are stored as fixed-2-decimal strings, e.g. "0.35", so JSON
 * persistence and lookups don't need fuzzy float comparison.
 */
export function keyframeTimeKey(time) {
  return Number(time).toFixed(2);
}

/**
 * Returns a copy of `animation` with per-keyframe overrides merged in.
 * For each bone track:
 *   - keyframes whose time matches an override get the override's fields
 *     merged in (rotation/x/y replace the source values).
 *   - override times that don't match any existing keyframe are inserted
 *     as NEW keyframes, sorted by time. This makes the override storage
 *     fully expressive — editing a bone at any time creates a keyframe.
 *
 * overrides shape: { [boneId]: { [timeKey]: { x?, y?, rotation? } } }
 */
export function resolveAnimation(animation, overrides) {
  if (!animation || !overrides) return animation;
  if (Object.keys(overrides).length === 0) return animation;
  const tracks = {};

  // Pass 1 — bones that exist in the source animation
  for (const [boneId, kfs] of Object.entries(animation.tracks)) {
    const boneOv = overrides[boneId];
    if (!boneOv) { tracks[boneId] = kfs; continue; }

    const covered = new Set();
    const merged = kfs.map(kf => {
      const k = keyframeTimeKey(kf.time);
      covered.add(k);
      const o = boneOv[k];
      return o ? { ...kf, ...o } : kf;
    });

    const extras = [];
    for (const [tk, vals] of Object.entries(boneOv)) {
      if (covered.has(tk)) continue;
      extras.push({ time: Number(tk), ...vals });
    }
    tracks[boneId] = extras.length
      ? [...merged, ...extras].sort((a, b) => a.time - b.time)
      : merged;
  }

  // Pass 2 — bones with overrides but no source track at all
  for (const [boneId, boneOv] of Object.entries(overrides)) {
    if (tracks[boneId]) continue;
    const kfs = Object.entries(boneOv)
      .map(([tk, vals]) => ({ time: Number(tk), ...vals }))
      .sort((a, b) => a.time - b.time);
    if (kfs.length) tracks[boneId] = kfs;
  }

  return { ...animation, tracks };
}
