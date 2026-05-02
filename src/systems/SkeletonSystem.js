/**
 * Bone hierarchy and world transform computation.
 *
 * Spine structure (3 joints per arm: shoulder → elbow → hand tip):
 *
 *   torso  (root — sits 62px above character origin)
 *   ├── head
 *   ├── left_arm  (shoulder)
 *   │   └── left_forearm  (elbow)
 *   │       └── left_hand  (wrist)
 *   ├── right_arm (shoulder)
 *   │   └── right_forearm (elbow)
 *   │       └── right_hand (wrist)
 *   └── lower_torso
 *       ├── left_leg  (hip)
 *       │   └── left_shin  (knee)
 *       │       └── left_foot  (ankle)
 *       └── right_leg (hip)
 *           └── right_shin (knee)
 *               └── right_foot (ankle)
 */
// Proportions use base unit U = 20px:
//   torso→head        = 3.6U = 72   (≈ 4U)
//   torso→lower_torso = 1.4U = 28
//   torso→shoulder    = 2U   = 40   (horizontal)
//   arm segment       = 2U   = 40   (upper arm AND forearm)
//   leg segment       = 1U   = 20   (shin AND foot)
export const BONES = {
  torso:          { id: 'torso',          parent: null,           localX: 0,   localY: -62, baseRotation: 0 },
  lower_torso:    { id: 'lower_torso',    parent: 'torso',        localX: 0,   localY: 28,  baseRotation: 0 },
  head:           { id: 'head',           parent: 'torso',        localX: 0,   localY: -72, baseRotation: 0 },
  left_arm:       { id: 'left_arm',       parent: 'torso',        localX: -40, localY: 0,   baseRotation: 0 },
  left_forearm:   { id: 'left_forearm',   parent: 'left_arm',     localX: 0,   localY: 40,  baseRotation: 0 },
  left_hand:      { id: 'left_hand',      parent: 'left_forearm', localX: 0,   localY: 40,  baseRotation: 0 },
  right_arm:      { id: 'right_arm',      parent: 'torso',        localX: 40,  localY: 0,   baseRotation: 0 },
  right_forearm:  { id: 'right_forearm',  parent: 'right_arm',    localX: 0,   localY: 40,  baseRotation: 0 },
  right_hand:     { id: 'right_hand',     parent: 'right_forearm',localX: 0,   localY: 40,  baseRotation: 0 },
  left_leg:       { id: 'left_leg',       parent: 'lower_torso',  localX: -18, localY: 10,  baseRotation: 0 },
  left_shin:      { id: 'left_shin',      parent: 'left_leg',     localX: 0,   localY: 20,  baseRotation: 0 },
  left_foot:      { id: 'left_foot',      parent: 'left_shin',    localX: 0,   localY: 20,  baseRotation: 0 },
  right_leg:      { id: 'right_leg',      parent: 'lower_torso',  localX: 18,  localY: 10,  baseRotation: 0 },
  right_shin:     { id: 'right_shin',     parent: 'right_leg',    localX: 0,   localY: 20,  baseRotation: 0 },
  right_foot:     { id: 'right_foot',     parent: 'right_shin',   localX: 0,   localY: 20,  baseRotation: 0 },
};

/**
 * Computes world-space transforms for every bone given an animation pose.
 * `pose` maps boneId -> { x?, y?, rotation? } layered on top of resting transform.
 */
export function computeWorldTransforms(pose = {}) {
  const world = {};

  function resolve(boneId) {
    if (world[boneId]) return world[boneId];

    const bone     = BONES[boneId];
    const override = pose[boneId] || {};

    const localX   = bone.localX + (override.x || 0);
    const localY   = bone.localY + (override.y || 0);
    const localRot = bone.baseRotation + (override.rotation || 0);

    if (!bone.parent) {
      world[boneId] = { x: localX, y: localY, rotation: localRot };
      return world[boneId];
    }

    const parent = resolve(bone.parent);
    const cos    = Math.cos(parent.rotation);
    const sin    = Math.sin(parent.rotation);

    world[boneId] = {
      x:        parent.x + cos * localX - sin * localY,
      y:        parent.y + sin * localX + cos * localY,
      rotation: parent.rotation + localRot,
    };

    return world[boneId];
  }

  for (const id of Object.keys(BONES)) resolve(id);
  return world;
}
