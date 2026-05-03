/**
 * Keyframe animation system.
 * Each animation is a collection of per-bone tracks.
 * Each track is an array of { time, x?, y?, rotation? } keyframes.
 *
 * Forearm bones add a natural elbow bend to every animation.
 * Positive forearm rotation = elbow bends forward (clockwise in canvas coords).
 */

export const ANIMATIONS = {
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
        { time: 0.0, rotation: 0.05 },
        { time: 1.0, rotation: 0.08 },
        { time: 2.0, rotation: 0.05 },
      ],
      left_forearm: [
        { time: 0.0, rotation: 0.12 },
        { time: 1.0, rotation: 0.16 },
        { time: 2.0, rotation: 0.12 },
      ],
      right_arm: [
        { time: 0.0, rotation: -0.05 },
        { time: 1.0, rotation: -0.08 },
        { time: 2.0, rotation: -0.05 },
      ],
      right_forearm: [
        { time: 0.0, rotation: -0.12 },
        { time: 1.0, rotation: -0.16 },
        { time: 2.0, rotation: -0.12 },
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
        { time: 0.00, rotation:  0.30 },
        { time: 0.36, rotation: -0.30 },
        { time: 0.72, rotation:  0.30 },
      ],
      left_forearm: [
        { time: 0.00, rotation:  0.45 },
        { time: 0.18, rotation:  0.18 },
        { time: 0.36, rotation:  0.08 },
        { time: 0.54, rotation:  0.18 },
        { time: 0.72, rotation:  0.45 },
      ],
      left_hand: [
        { time: 0.00, rotation:  0.18 },
        { time: 0.36, rotation:  0.06 },
        { time: 0.72, rotation:  0.18 },
      ],
      right_arm: [
        { time: 0.00, rotation: -0.30 },
        { time: 0.36, rotation:  0.30 },
        { time: 0.72, rotation: -0.30 },
      ],
      right_forearm: [
        { time: 0.00, rotation: -0.08 },
        { time: 0.18, rotation: -0.18 },
        { time: 0.36, rotation: -0.45 },
        { time: 0.54, rotation: -0.18 },
        { time: 0.72, rotation: -0.08 },
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
        { time: 0.000, rotation:  0.58 },
        { time: 0.225, rotation: -0.58 },
        { time: 0.450, rotation:  0.58 },
      ],
      // Forearm stays bent ~90° and lags the upper arm slightly
      left_forearm: [
        { time: 0.000, rotation:  0.52 },
        { time: 0.113, rotation:  0.22 },
        { time: 0.225, rotation:  0.10 },
        { time: 0.338, rotation:  0.22 },
        { time: 0.450, rotation:  0.52 },
      ],
      left_hand: [
        { time: 0.000, rotation:  0.20 },
        { time: 0.225, rotation:  0.08 },
        { time: 0.450, rotation:  0.20 },
      ],
      right_arm: [
        { time: 0.000, rotation: -0.58 },
        { time: 0.225, rotation:  0.58 },
        { time: 0.450, rotation: -0.58 },
      ],
      right_forearm: [
        { time: 0.000, rotation: -0.10 },
        { time: 0.113, rotation: -0.22 },
        { time: 0.225, rotation: -0.52 },
        { time: 0.338, rotation: -0.22 },
        { time: 0.450, rotation: -0.10 },
      ],
      right_hand: [
        { time: 0.000, rotation: -0.08 },
        { time: 0.225, rotation: -0.20 },
        { time: 0.450, rotation: -0.08 },
      ],
    },
  },

  jump: {
    name: 'Jump',
    duration: 0.9,
    loop: false,
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
        { time: 0.0,  rotation:  0 },
        { time: 0.12, rotation:  0.5 },
        { time: 0.35, rotation: -0.7 },
        { time: 0.68, rotation:  0.4 },
        { time: 0.9,  rotation:  0 },
      ],
      // Forearm drags behind upper arm like a pendulum
      left_forearm: [
        { time: 0.0,  rotation:  0.12 },
        { time: 0.12, rotation:  0.5 },  // droop during crouch
        { time: 0.35, rotation: -0.3 },  // trails as arm rises
        { time: 0.68, rotation:  0.6 },  // bounces on land
        { time: 0.9,  rotation:  0.12 },
      ],
      right_arm: [
        { time: 0.0,  rotation:  0 },
        { time: 0.12, rotation: -0.5 },
        { time: 0.35, rotation:  0.7 },
        { time: 0.68, rotation: -0.4 },
        { time: 0.9,  rotation:  0 },
      ],
      right_forearm: [
        { time: 0.0,  rotation: -0.12 },
        { time: 0.12, rotation: -0.5 },
        { time: 0.35, rotation:  0.3 },
        { time: 0.68, rotation: -0.6 },
        { time: 0.9,  rotation: -0.12 },
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

  attack: {
    name: 'Attack',
    duration: 0.65,
    loop: false,
    tracks: {
      // Upper arm: wind-up back, then slam forward
      right_arm: [
        { time: 0.0,  rotation:  0 },
        { time: 0.18, rotation: -1.3 },
        { time: 0.35, rotation:  2.1 },
        { time: 0.65, rotation:  0 },
      ],
      // Forearm: lags on wind-up, whips forward at strike, snaps back
      right_forearm: [
        { time: 0.0,  rotation:  0 },
        { time: 0.18, rotation:  0.5 },  // trails behind upper arm
        { time: 0.28, rotation: -0.8 },  // whips forward just before contact
        { time: 0.40, rotation:  0.3 },  // follows through
        { time: 0.65, rotation:  0 },
      ],
      // Wrist: cocks back, snaps forward with the strike
      right_hand: [
        { time: 0.0,  rotation:  0 },
        { time: 0.18, rotation:  0.4 },  // cocks back
        { time: 0.28, rotation: -0.7 },  // snaps through on contact
        { time: 0.45, rotation:  0.2 },
        { time: 0.65, rotation:  0 },
      ],
      torso: [
        { time: 0.0,  rotation:  0 },
        { time: 0.18, rotation: -0.18 },
        { time: 0.35, rotation:  0.22 },
        { time: 0.65, rotation:  0 },
      ],
      lower_torso: [
        { time: 0.0,  rotation:  0 },
        { time: 0.18, rotation: -0.08 },
        { time: 0.35, rotation:  0.12 },
        { time: 0.65, rotation:  0 },
      ],
      // Slight knee bend held during attack stance
      left_shin: [
        { time: 0.0,  rotation: 0.15 },
        { time: 0.65, rotation: 0.15 },
      ],
      right_shin: [
        { time: 0.0,  rotation: 0.15 },
        { time: 0.65, rotation: 0.15 },
      ],
      left_foot: [
        { time: 0.0,  rotation: 0.06 },
        { time: 0.65, rotation: 0.06 },
      ],
      right_foot: [
        { time: 0.0,  rotation: 0.06 },
        { time: 0.65, rotation: 0.06 },
      ],
      head: [
        { time: 0.0,  rotation:  0 },
        { time: 0.18, rotation:  0.1 },
        { time: 0.35, rotation: -0.1 },
        { time: 0.65, rotation:  0 },
      ],
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
        { time: 0.000, rotation: -3.70 },
        { time: 0.450, rotation: -3.75 },
        { time: 0.900, rotation: -3.70 },
      ],
      left_forearm: [
        { time: 0.000, rotation: -0.25 },
        { time: 0.450, rotation: -0.20 },
        { time: 0.900, rotation: -0.25 },
      ],
      left_hand: [
        { time: 0.0, rotation: -0.08 },
        { time: 0.9, rotation: -0.08 },
      ],
      // Right arm: spread backward (past vertical — tilted toward back)
      right_arm: [
        { time: 0.000, rotation: -3.55 },
        { time: 0.450, rotation: -3.60 },
        { time: 0.900, rotation: -3.55 },
      ],
      right_forearm: [
        { time: 0.000, rotation: -0.28 },
        { time: 0.450, rotation: -0.22 },
        { time: 0.900, rotation: -0.28 },
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
    name: 'Rifle',
    duration: 0.6,
    loop: true,
    tracks: {
      // Upright hip-fire stance. Body rocks back on fire, rebounds.
      torso: [
        { time: 0.00, y:  0, rotation:  0.00 },
        { time: 0.03, y:  2, rotation: -0.06 },  // BANG — body rocks back
        { time: 0.22, y: -1, rotation:  0.02 },  // rebounds
        { time: 0.60, y:  0, rotation:  0.00 },
      ],
      lower_torso: [
        { time: 0.00, rotation:  0.00 },
        { time: 0.03, rotation: -0.08 },  // hips absorb impulse
        { time: 0.32, rotation:  0.00 },
        { time: 0.60, rotation:  0.00 },
      ],
      // Head upright; jolts back slightly on fire
      head: [
        { time: 0.00, rotation: -0.05 },
        { time: 0.06, rotation:  0.04 },
        { time: 0.38, rotation: -0.06 },
        { time: 0.60, rotation: -0.05 },
      ],
      // Right arm (trigger hand) — arm angled forward at hip level, kicks up on fire
      right_arm: [
        { time: 0.00, rotation: -0.55 },
        { time: 0.03, rotation: -0.82 },  // muzzle rise
        { time: 0.28, rotation: -0.52 },
        { time: 0.60, rotation: -0.55 },
      ],
      right_forearm: [
        { time: 0.00, rotation: -0.85 },
        { time: 0.03, rotation: -1.05 },  // wrist whips up
        { time: 0.32, rotation: -0.82 },
        { time: 0.60, rotation: -0.85 },
      ],
      right_hand: [
        { time: 0.00, rotation: -0.17 },
        { time: 0.03, rotation:  0.04 },  // kicks up from recoil
        { time: 0.32, rotation: -0.20 },
        { time: 0.60, rotation: -0.17 },
      ],
      // Left arm (support hand) — reaches forward along barrel at hip level
      left_arm: [
        { time: 0.00, rotation: -0.65 },
        { time: 0.03, rotation: -0.88 },
        { time: 0.30, rotation: -0.62 },
        { time: 0.60, rotation: -0.65 },
      ],
      left_forearm: [
        { time: 0.00, rotation: -0.72 },
        { time: 0.03, rotation: -0.90 },
        { time: 0.32, rotation: -0.68 },
        { time: 0.60, rotation: -0.72 },
      ],
      left_hand: [
        { time: 0.00, rotation: -0.10 },
        { time: 0.03, rotation: -0.16 },
        { time: 0.32, rotation: -0.08 },
        { time: 0.60, rotation: -0.10 },
      ],
      // Legs: braced wide stance — static
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
        { time: 0.00, rotation: -0.35 },
        { time: 0.02, rotation: -0.62 },  // muzzle kicks up
        { time: 0.07, rotation: -0.32 },
        { time: 0.12, rotation: -0.35 },
      ],
      right_forearm: [
        { time: 0.00, rotation: -0.75 },
        { time: 0.02, rotation: -0.98 },
        { time: 0.07, rotation: -0.72 },
        { time: 0.12, rotation: -0.75 },
      ],
      right_hand: [
        { time: 0.00, rotation: -0.15 },
        { time: 0.02, rotation:  0.10 },  // wrist whips from recoil
        { time: 0.07, rotation: -0.18 },
        { time: 0.12, rotation: -0.15 },
      ],
      // Left arm (support hand) — grips barrel low, follows the kick
      left_arm: [
        { time: 0.00, rotation: -0.45 },
        { time: 0.02, rotation: -0.68 },
        { time: 0.07, rotation: -0.42 },
        { time: 0.12, rotation: -0.45 },
      ],
      left_forearm: [
        { time: 0.00, rotation: -0.62 },
        { time: 0.02, rotation: -0.82 },
        { time: 0.07, rotation: -0.60 },
        { time: 0.12, rotation: -0.62 },
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
        { time: 0.000, rotation:  0.90 },
        { time: 0.200, rotation: -1.30 },
        { time: 0.400, rotation:  0.90 },
      ],
      left_forearm: [
        { time: 0.000, rotation:  0.65 },
        { time: 0.100, rotation:  1.00 },  // droops behind on backswing
        { time: 0.200, rotation:  0.15 },  // trails as arm whips forward
        { time: 0.300, rotation:  0.45 },
        { time: 0.400, rotation:  0.65 },
      ],
      left_hand: [
        { time: 0.000, rotation:  0.35 },
        { time: 0.200, rotation:  0.08 },
        { time: 0.400, rotation:  0.35 },
      ],
      // Right arm: opposite phase — thrown wildly backward from forward position
      right_arm: [
        { time: 0.000, rotation: -0.90 },
        { time: 0.200, rotation:  1.10 },
        { time: 0.400, rotation: -0.90 },
      ],
      right_forearm: [
        { time: 0.000, rotation: -0.15 },
        { time: 0.100, rotation: -0.55 },
        { time: 0.200, rotation: -0.70 },  // trails on the big backswing
        { time: 0.300, rotation: -0.25 },
        { time: 0.400, rotation: -0.15 },
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
