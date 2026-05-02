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
    duration: 0.8,
    loop: true,
    tracks: {
      // Vertical bob + slight counter-rotation opposing hips
      torso: [
        { time: 0.0, y:  0, rotation: -0.03 },
        { time: 0.2, y: -4, rotation:  0.00 },
        { time: 0.4, y:  0, rotation:  0.03 },
        { time: 0.6, y: -4, rotation:  0.00 },
        { time: 0.8, y:  0, rotation: -0.03 },
      ],
      // Hip rotation drives legs; ±0.10 gives visible pelvis swing
      lower_torso: [
        { time: 0.0, rotation:  0.10 },
        { time: 0.2, rotation:  0.00 },
        { time: 0.4, rotation: -0.10 },
        { time: 0.6, rotation:  0.00 },
        { time: 0.8, rotation:  0.10 },
      ],
      // Head nods gently on each step
      head: [
        { time: 0.0, rotation:  0.00 },
        { time: 0.2, rotation:  0.025 },
        { time: 0.4, rotation:  0.00 },
        { time: 0.6, rotation:  0.025 },
        { time: 0.8, rotation:  0.00 },
      ],
      // --- LEFT LEG (forward at t=0 = heel strike, back at t=0.4 = push-off) ---
      left_leg: [
        { time: 0.0, rotation: -0.45 },
        { time: 0.4, rotation:  0.45 },
        { time: 0.8, rotation: -0.45 },
      ],
      // Knee nearly straight at heel strike/mid-stance; bends hard at mid-swing (t=0.6)
      left_shin: [
        { time: 0.0, rotation:  0.10 },
        { time: 0.2, rotation:  0.08 },
        { time: 0.4, rotation:  0.15 },
        { time: 0.6, rotation:  0.50 },
        { time: 0.8, rotation:  0.10 },
      ],
      // Dorsiflexed at heel strike, flat at mid-stance, plantarflexed at push-off, lifted in swing
      left_foot: [
        { time: 0.0, rotation: -0.20 },
        { time: 0.2, rotation:  0.00 },
        { time: 0.4, rotation:  0.25 },
        { time: 0.6, rotation: -0.08 },
        { time: 0.8, rotation: -0.20 },
      ],
      // --- RIGHT LEG (back at t=0 = push-off, forward at t=0.4 = heel strike) ---
      right_leg: [
        { time: 0.0, rotation:  0.45 },
        { time: 0.4, rotation: -0.45 },
        { time: 0.8, rotation:  0.45 },
      ],
      // Mid-swing clearance at t=0.2; straight at heel strike (t=0.4)
      right_shin: [
        { time: 0.0, rotation:  0.15 },
        { time: 0.2, rotation:  0.50 },
        { time: 0.4, rotation:  0.10 },
        { time: 0.6, rotation:  0.08 },
        { time: 0.8, rotation:  0.15 },
      ],
      right_foot: [
        { time: 0.0, rotation:  0.25 },
        { time: 0.2, rotation: -0.08 },
        { time: 0.4, rotation: -0.20 },
        { time: 0.6, rotation:  0.00 },
        { time: 0.8, rotation:  0.25 },
      ],
      // --- ARMS (opposite to legs: left arm back when left leg forward) ---
      left_arm: [
        { time: 0.0, rotation:  0.38 },
        { time: 0.4, rotation: -0.38 },
        { time: 0.8, rotation:  0.38 },
      ],
      // Forearm lags upper arm (pendulum): more bent when arm is fully back
      left_forearm: [
        { time: 0.0, rotation:  0.32 },
        { time: 0.2, rotation:  0.12 },
        { time: 0.4, rotation:  0.05 },
        { time: 0.6, rotation:  0.12 },
        { time: 0.8, rotation:  0.32 },
      ],
      left_hand: [
        { time: 0.0, rotation:  0.14 },
        { time: 0.4, rotation:  0.04 },
        { time: 0.8, rotation:  0.14 },
      ],
      right_arm: [
        { time: 0.0, rotation: -0.38 },
        { time: 0.4, rotation:  0.38 },
        { time: 0.8, rotation: -0.38 },
      ],
      right_forearm: [
        { time: 0.0, rotation: -0.05 },
        { time: 0.2, rotation: -0.12 },
        { time: 0.4, rotation: -0.32 },
        { time: 0.6, rotation: -0.12 },
        { time: 0.8, rotation: -0.05 },
      ],
      right_hand: [
        { time: 0.0, rotation: -0.04 },
        { time: 0.4, rotation: -0.14 },
        { time: 0.8, rotation: -0.04 },
      ],
    },
  },

  jump: {
    name: 'Jump',
    duration: 0.9,
    loop: false,
    tracks: {
      torso: [
        { time: 0.0,  y:  0,  rotation: 0 },
        { time: 0.12, y: 13,  rotation: 0 },  // root(8) + torso(5)
        { time: 0.35, y: -44, rotation: 0 },  // root(-38) + torso(-6)
        { time: 0.58, y: -8,  rotation: 0 },  // root(-10) + torso(≈2)
        { time: 0.68, y:  8,  rotation: 0 },  // root(4) + torso(4)
        { time: 0.80, y: -1,  rotation: 0 },  // root(-3) + torso(≈2)
        { time: 0.9,  y:  0,  rotation: 0 },
      ],
      lower_torso: [
        { time: 0.0,  y: 0 },
        { time: 0.12, y: 3 },
        { time: 0.35, y: -3 },
        { time: 0.68, y: 2 },
        { time: 0.9,  y: 0 },
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
