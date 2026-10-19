// Built-in animation templates offered to every character in the "+ New" dialog.
// Each one is PURE BONE MOTION — duration, loop flag and keyframe tracks only.
// Skins, uploaded images, layer order and weapon/accessory settings are never
// part of a template: the receiving character keeps its own.
//
// `carry` was extracted from the workspace's "Cat - Conscript" Carry animation
// (customAnimations.carry_walk with its animBoneOffsets baked in).
export const DEFAULT_ANIM_TEMPLATES = [
  {
    id: 'tpl_carry',
    name: 'Carry',
    duration: 0.9,
    loop: true,
    builtIn: true,
    tracks: {
      torso: [
        { time: 0, x: 1.0053, y: 1.7364, rotation: 0.15 },
        { time: 0.225, x: 1.0053, y: -0.2636, rotation: 0.16 },
        { time: 0.45, x: 1.0053, y: 1.7364, rotation: 0.15 },
        { time: 0.675, x: 1.0053, y: -0.2636, rotation: 0.16 },
        { time: 0.9, x: 1.0053, y: 1.7364, rotation: 0.15 },
      ],
      lower_torso: [
        { time: 0, rotation: -0.05 },
        { time: 0.225, rotation: -0.1 },
        { time: 0.45, rotation: -0.05 },
        { time: 0.675, rotation: -0.1 },
        { time: 0.9, rotation: -0.05 },
      ],
      head: [
        { time: 0, x: -19.7376, y: 2.1998, rotation: -0.2059 },
        { time: 0.9, x: -19.7376, y: 2.1998, rotation: -0.2059 },
      ],
      left_arm: [
        { time: 0, y: 6, rotation: -2.3161 },
        { time: 0.45, y: 6, rotation: -2.3661 },
        { time: 0.9, y: 6, rotation: -2.3161 },
      ],
      left_forearm: [
        { time: 0, rotation: -0.73 },
        { time: 0.45, rotation: -0.68 },
        { time: 0.9, rotation: -0.73 },
      ],
      left_hand: [
        { time: 0, rotation: -0.08 },
        { time: 0.9, rotation: -0.08 },
      ],
      right_arm: [
        { time: 0, rotation: 2.0311 },
        { time: 0.45, rotation: 1.9811 },
        { time: 0.9, rotation: 2.0311 },
      ],
      right_forearm: [
        { time: 0, rotation: -2.1417 },
        { time: 0.45, rotation: -2.0817 },
        { time: 0.9, rotation: -2.1417 },
      ],
      right_hand: [
        { time: 0, rotation: -0.1 },
        { time: 0.9, rotation: -0.1 },
      ],
      left_leg: [
        { time: 0, x: 1.1719, y: 2.1048, rotation: -0.35 },
        { time: 0.45, x: 1.1719, y: 2.1048, rotation: 0.35 },
        { time: 0.9, x: 1.1719, y: 2.1048, rotation: -0.35 },
      ],
      left_shin: [
        { time: 0, rotation: 0.1 },
        { time: 0.225, rotation: 0.08 },
        { time: 0.45, rotation: 0.16 },
        { time: 0.675, rotation: 0.48 },
        { time: 0.9, rotation: 0.1 },
      ],
      left_foot: [
        { time: 0, rotation: -0.18 },
        { time: 0.225, rotation: 0 },
        { time: 0.45, rotation: 0.25 },
        { time: 0.675, rotation: -0.08 },
        { time: 0.9, rotation: -0.18 },
      ],
      right_leg: [
        { time: 0, rotation: 0.35 },
        { time: 0.45, rotation: -0.35 },
        { time: 0.9, rotation: 0.35 },
      ],
      right_shin: [
        { time: 0, rotation: 0.16 },
        { time: 0.225, rotation: 0.48 },
        { time: 0.45, rotation: 0.1 },
        { time: 0.675, rotation: 0.08 },
        { time: 0.9, rotation: 0.16 },
      ],
      right_foot: [
        { time: 0, rotation: 0.25 },
        { time: 0.225, rotation: -0.08 },
        { time: 0.45, rotation: -0.18 },
        { time: 0.675, rotation: 0 },
        { time: 0.9, rotation: 0.25 },
      ],
    },
  },
  // Extracted from the workspace's 'Cat - Conscript' 'throw' animation
  // (customAnimations.throw baked through resolveAnimation + animBoneOffsets).
  {
    id: 'tpl_throw',
    name: 'Throw',
    duration: 1.2,
    loop: true,
    builtIn: true,
    tracks: {
      torso: [
        { time: 0, x: 0.6108, y: 0.3609, rotation: 0 },
        { time: 0.3, x: -0.9022, y: 1.3696, rotation: 0.22 },
        { time: 0.55, x: -0.9022, y: -1.6304, rotation: -0.18 },
        { time: 0.75, x: -0.9022, y: 1.3696, rotation: -0.04 },
        { time: 1.2, x: 0.6108, y: 0.3609, rotation: 0 },
      ],
      lower_torso: [
        { time: 0, x: 3.7848, y: 0.0341, rotation: 0 },
        { time: 0.3, rotation: 0.12 },
        { time: 0.55, rotation: -0.1 },
        { time: 0.75, rotation: 0 },
        { time: 1.2, x: 3.7848, y: 0.0341, rotation: 0 },
      ],
      head: [
        { time: 0, x: -9.3156, y: -0.0267, rotation: 0 },
        { time: 0.3, x: -2.5287, y: 0.1995, rotation: -0.1 },
        { time: 0.55, x: -2.5287, y: 0.1995, rotation: 0.04 },
        { time: 1.2, x: -9.3156, y: -0.0267, rotation: 0 },
      ],
      left_arm: [
        { time: 0, rotation: -5.483 },
        { time: 0.3, rotation: -3.2698 },
        { time: 0.45, rotation: -2.7325 },
        { time: 0.55, rotation: -1.3282 },
        { time: 0.75, rotation: -1.2 },
        { time: 1, rotation: -1.023 },
        { time: 1.2, rotation: -5.483 },
      ],
      right_arm: [
        { time: 0, rotation: -2.1469 },
        { time: 0.3, rotation: -0.0723 },
        { time: 0.45, rotation: 0.5064 },
        { time: 0.55, rotation: 1.054 },
        { time: 0.75, rotation: 1.5502 },
        { time: 1, rotation: 1.022 },
        { time: 1.2, rotation: -2.1469 },
      ],
      left_forearm: [
        { time: 0, rotation: 0.0895 },
        { time: 0.3, rotation: -0.0895 },
        { time: 0.45, rotation: -0.4182 },
        { time: 0.55, rotation: -0.8996 },
        { time: 0.75, rotation: -0.25 },
        { time: 1, rotation: -0.318 },
        { time: 1.2, rotation: 0.0895 },
      ],
      right_forearm: [
        { time: 0, rotation: 0.0895 },
        { time: 0.3, rotation: -0.4327 },
        { time: 0.45, rotation: -0.5673 },
        { time: 0.55, rotation: -0.5674 },
        { time: 0.75, rotation: -0.7175 },
        { time: 1, rotation: -0.558 },
        { time: 1.2, rotation: 0.0895 },
      ],
      left_hand: [
        { time: 0, rotation: 0.06 },
        { time: 0.45, rotation: 0.2 },
        { time: 0.55, rotation: 0.45 },
        { time: 0.75, rotation: 0.1 },
        { time: 1.2, rotation: 0.06 },
      ],
      right_hand: [
        { time: 0, rotation: -0.06 },
        { time: 0.45, rotation: -0.2 },
        { time: 0.55, rotation: -0.45 },
        { time: 0.75, rotation: -0.1 },
        { time: 1.2, rotation: -0.06 },
      ],
      left_leg: [
        { time: 0, x: -0.5046, y: -0.2797, rotation: -0.04 },
        { time: 0.3, rotation: -0.18 },
        { time: 0.55, rotation: 0.1 },
        { time: 0.75, rotation: 0 },
        { time: 1.2, x: -0.5046, y: -0.2797, rotation: -0.04 },
      ],
      right_leg: [
        { time: 0, rotation: 0.04 },
        { time: 0.3, rotation: 0.18 },
        { time: 0.55, rotation: -0.1 },
        { time: 0.75, rotation: 0 },
        { time: 1.2, rotation: 0.04 },
      ],
      left_shin: [
        { time: 0, rotation: 0.1 },
        { time: 0.3, rotation: 0.3 },
        { time: 0.55, rotation: 0.08 },
        { time: 1.2, rotation: 0.1 },
      ],
      right_shin: [
        { time: 0, rotation: 0.1 },
        { time: 0.3, rotation: 0.06 },
        { time: 0.55, rotation: 0.22 },
        { time: 1.2, rotation: 0.1 },
      ],
      left_foot: [
        { time: 0, rotation: 0 },
        { time: 1.2, rotation: 0 },
      ],
      right_foot: [
        { time: 0, rotation: 0 },
        { time: 1.2, rotation: 0 },
      ],
    },
  },
  // Extracted from the workspace's 'Cat - Rifle' 'attack' animation
  // (customAnimations.rifle baked through resolveAnimation + animBoneOffsets).
  {
    id: 'tpl_rifle_attack',
    name: 'Rifle Attack',
    duration: 0.6,
    loop: true,
    builtIn: true,
    tracks: {
      torso: [
        { time: 0, x: -5.785, y: -1.7179, rotation: 0.04 },
        { time: 0.03, x: -5.785, y: 0.2821, rotation: -0.05 },
        { time: 0.18, x: -5.785, y: -2.7179, rotation: 0.07 },
        { time: 0.4, x: -5.785, y: -1.7179, rotation: 0.04 },
        { time: 0.6, x: -5.785, y: -1.7179, rotation: 0.04 },
      ],
      lower_torso: [
        { time: 0, rotation: 0 },
        { time: 0.03, rotation: -0.07 },
        { time: 0.3, rotation: 0 },
        { time: 0.6, rotation: 0 },
      ],
      head: [
        { time: 0, rotation: 0.0362 },
        { time: 0.03, x: -5.5474, y: 0.3944, rotation: 0 },
        { time: 0.05, rotation: 0.0862 },
        { time: 0.18, x: -3.6723, y: 0.2004, rotation: 0 },
        { time: 0.3, rotation: 0.0162 },
        { time: 0.6, rotation: 0.0362 },
      ],
      right_arm: [
        { time: 0, rotation: 1.3374 },
        { time: 0.03, rotation: 1.8712 },
        { time: 0.18, rotation: 1.9167 },
        { time: 0.25, rotation: 1.6472 },
        { time: 0.4, rotation: 1.6414 },
        { time: 0.6, rotation: 1.3374 },
      ],
      right_forearm: [
        { time: 0, rotation: -1.3632 },
        { time: 0.03, rotation: -2.2773 },
        { time: 0.18, rotation: -2.0519 },
        { time: 0.25, rotation: -1.552 },
        { time: 0.4, rotation: -1.6221 },
        { time: 0.6, rotation: -1.3632 },
      ],
      right_hand: [
        { time: 0, rotation: 0 },
        { time: 0.03, rotation: 0.25 },
        { time: 0.3, rotation: 0 },
        { time: 0.6, rotation: 0 },
      ],
      left_arm: [
        { time: 0, rotation: -0.9988 },
        { time: 0.03, rotation: -0.6201 },
        { time: 0.18, rotation: -0.7564 },
        { time: 0.25, rotation: -1.0388 },
        { time: 0.6, rotation: -0.9988 },
      ],
      left_forearm: [
        { time: 0, rotation: -1.5266 },
        { time: 0.03, rotation: -1.806 },
        { time: 0.18, rotation: -2.0329 },
        { time: 0.3, rotation: -1.4966 },
        { time: 0.6, rotation: -1.5266 },
      ],
      left_hand: [
        { time: 0, rotation: 0 },
        { time: 0.03, rotation: 0.1 },
        { time: 0.3, rotation: 0 },
        { time: 0.6, rotation: 0 },
      ],
      left_leg: [
        { time: 0, x: 0.9306, y: 1.7186, rotation: -0.15 },
        { time: 0.6, x: 0.9306, y: 1.7186, rotation: -0.15 },
      ],
      left_shin: [
        { time: 0, rotation: 0.22 },
        { time: 0.6, rotation: 0.22 },
      ],
      left_foot: [
        { time: 0, rotation: -0.05 },
        { time: 0.6, rotation: -0.05 },
      ],
      right_leg: [
        { time: 0, rotation: -0.2468 },
        { time: 0.6, rotation: -0.2468 },
      ],
      right_shin: [
        { time: 0, rotation: -0.0902 },
        { time: 0.6, rotation: -0.0902 },
      ],
      right_foot: [
        { time: 0, rotation: 0.06 },
        { time: 0.6, rotation: 0.06 },
      ],
    },
  },
  // Extracted from the workspace's 'Cat - Pistol' 'Shoot' animation
  // (built-in pistol_fire baked through resolveAnimation + animBoneOffsets).
  {
    id: 'tpl_pistol_attack',
    name: 'Pistol Attack',
    duration: 0.6,
    loop: true,
    builtIn: true,
    tracks: {
      torso: [
        { time: 0, y: 0, rotation: 0.08 },
        { time: 0.03, y: 2, rotation: -0.04 },
        { time: 0.18, y: -1, rotation: 0.1 },
        { time: 0.4, y: 0, rotation: 0.08 },
        { time: 0.6, y: 0, rotation: 0.08 },
      ],
      lower_torso: [
        { time: 0, rotation: 0 },
        { time: 0.03, rotation: -0.06 },
        { time: 0.3, rotation: 0 },
        { time: 0.6, rotation: 0 },
      ],
      head: [
        { time: 0, x: -16.7929, y: 1.5414, rotation: -0.0686 },
        { time: 0.03, x: -21.323, y: 1.7455, rotation: -0.0686 },
        { time: 0.05, x: -16.7929, y: 1.5414, rotation: -0.0186 },
        { time: 0.3, x: -16.7929, y: 1.5414, rotation: -0.0886 },
        { time: 0.6, x: -16.7929, y: 1.5414, rotation: -0.0686 },
      ],
      right_arm: [
        { time: 0, rotation: 0.312 },
        { time: 0.03, x: 0, y: -0.3948, rotation: 1 },
        { time: 0.25, rotation: 1.13 },
        { time: 0.4, rotation: 0.7446 },
        { time: 0.6, rotation: 0.312 },
      ],
      right_forearm: [
        { time: 0, rotation: -0.3964 },
        { time: 0.03, rotation: -1.82 },
        { time: 0.25, rotation: -1.44 },
        { time: 0.4, rotation: -0.8688 },
        { time: 0.6, rotation: -0.3964 },
      ],
      right_hand: [
        { time: 0, rotation: 0 },
        { time: 0.03, rotation: 0.22 },
        { time: 0.3, rotation: 0 },
        { time: 0.6, rotation: 0 },
      ],
      left_arm: [
        { time: 0, rotation: -0.88 },
        { time: 0.6, rotation: -0.88 },
      ],
      left_forearm: [
        { time: 0, rotation: -0.4 },
        { time: 0.6, rotation: -0.4 },
      ],
      left_hand: [
        { time: 0, rotation: 0.06 },
        { time: 0.6, rotation: 0.06 },
      ],
      left_leg: [
        { time: 0, rotation: -0.15 },
        { time: 0.6, rotation: -0.15 },
      ],
      left_shin: [
        { time: 0, rotation: 0.22 },
        { time: 0.6, rotation: 0.22 },
      ],
      left_foot: [
        { time: 0, rotation: -0.05 },
        { time: 0.6, rotation: -0.05 },
      ],
      right_leg: [
        { time: 0, rotation: -0.3305 },
        { time: 0.6, rotation: -0.3305 },
      ],
      right_shin: [
        { time: 0, rotation: -0.0902 },
        { time: 0.6, rotation: -0.0902 },
      ],
      right_foot: [
        { time: 0, rotation: 0.06 },
        { time: 0.6, rotation: 0.06 },
      ],
    },
  },
  // Extracted from the workspace's 'Cat - Conscript' 'walk' animation
  // (customAnimations.walk baked through resolveAnimation + animBoneOffsets).
  {
    id: 'tpl_walk',
    name: 'Walk',
    duration: 0.72,
    loop: true,
    builtIn: true,
    tracks: {
      torso: [
        { time: 0, x: -2.5707, y: 2.9287, rotation: -0.04 },
        { time: 0.18, x: -2.5707, y: -3.0713, rotation: 0 },
        { time: 0.36, x: -2.5707, y: 2.9287, rotation: 0.04 },
        { time: 0.54, x: -2.5707, y: -3.0713, rotation: 0 },
        { time: 0.72, x: -2.5707, y: 2.9287, rotation: -0.04 },
      ],
      lower_torso: [
        { time: 0, rotation: 0.14 },
        { time: 0.18, rotation: 0 },
        { time: 0.36, rotation: -0.14 },
        { time: 0.54, rotation: 0 },
        { time: 0.72, rotation: 0.14 },
      ],
      head: [
        { time: 0, rotation: 0 },
        { time: 0.22, rotation: 0.05 },
        { time: 0.36, rotation: 0 },
        { time: 0.58, rotation: 0.05 },
        { time: 0.72, rotation: 0 },
      ],
      left_leg: [
        { time: 0, rotation: -0.42 },
        { time: 0.36, rotation: 0.42 },
        { time: 0.72, rotation: -0.42 },
      ],
      left_shin: [
        { time: 0, rotation: 0.1 },
        { time: 0.18, rotation: 0.08 },
        { time: 0.36, rotation: 0.18 },
        { time: 0.54, rotation: 0.65 },
        { time: 0.72, rotation: 0.1 },
      ],
      left_foot: [
        { time: 0, rotation: -0.22 },
        { time: 0.18, rotation: 0 },
        { time: 0.36, rotation: 0.3 },
        { time: 0.54, rotation: -0.1 },
        { time: 0.72, rotation: -0.22 },
      ],
      right_leg: [
        { time: 0, rotation: 0.42 },
        { time: 0.36, rotation: -0.42 },
        { time: 0.72, rotation: 0.42 },
      ],
      right_shin: [
        { time: 0, rotation: 0.18 },
        { time: 0.18, rotation: 0.65 },
        { time: 0.36, rotation: 0.1 },
        { time: 0.54, rotation: 0.08 },
        { time: 0.72, rotation: 0.18 },
      ],
      right_foot: [
        { time: 0, rotation: 0.3 },
        { time: 0.18, rotation: -0.1 },
        { time: 0.36, rotation: -0.22 },
        { time: 0.54, rotation: 0 },
        { time: 0.72, rotation: 0.3 },
      ],
      left_arm: [
        { time: 0, rotation: -0.773 },
        { time: 0.36, rotation: -1.373 },
        { time: 0.72, rotation: -0.773 },
      ],
      left_forearm: [
        { time: 0, rotation: 0.012 },
        { time: 0.18, rotation: -0.258 },
        { time: 0.36, rotation: -0.358 },
        { time: 0.54, rotation: -0.258 },
        { time: 0.72, rotation: 0.012 },
      ],
      left_hand: [
        { time: 0, rotation: 0.18 },
        { time: 0.36, rotation: 0.06 },
        { time: 0.72, rotation: 0.18 },
      ],
      right_arm: [
        { time: 0, rotation: 0.772 },
        { time: 0.36, rotation: 1.372 },
        { time: 0.72, rotation: 0.772 },
      ],
      right_forearm: [
        { time: 0, rotation: -0.518 },
        { time: 0.18, rotation: -0.618 },
        { time: 0.36, rotation: -0.888 },
        { time: 0.54, rotation: -0.618 },
        { time: 0.72, rotation: -0.518 },
      ],
      right_hand: [
        { time: 0, rotation: -0.06 },
        { time: 0.36, rotation: -0.18 },
        { time: 0.72, rotation: -0.06 },
      ],
    },
  },
];
