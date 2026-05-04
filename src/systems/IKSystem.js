import { BONES, computeWorldTransforms } from './SkeletonSystem.js';
import { mergeOffsets } from '../utils/transforms.js';

// Effective bone offset = rest offset + structural override.
// Used so ragdoll IK preserves whatever lengths the user set in Edit Structure mode.
function effOffset(boneId, offsets) {
  const b = BONES[boneId];
  const o = offsets[boneId] || {};
  return { x: b.localX + (o.x || 0), y: b.localY + (o.y || 0) };
}

// Per-joint IK strategy.
//   translate     — root: shift x/y, no length constraint
//   pivot         — child of a multi-child parent: rotate own offset around parent joint
//                   (preserves bone length, leaves siblings undisturbed)
//                   optional `clamp: { rest, half }` limits the angle to ±half rad of rest
//                   (rest in parent's local frame, atan2(localY, localX))
//   rotateParent  — child of a single-child parent: change parent's rotation
//   fabrik2       — 2-segment chain (hand, foot): pin grandparent, set both rotations
const IK_PLAN = {
  torso:         { kind: 'translate' },

  // Head: clamp to ±22° from straight-up, so it can't be ragdolled down through the torso.
  head:          { kind: 'pivot', clamp: { rest: -Math.PI / 2, half: Math.PI * (22 / 180) } },
  lower_torso:   { kind: 'pivot' },
  left_arm:      { kind: 'pivot' },
  right_arm:     { kind: 'pivot' },
  left_leg:      { kind: 'pivot' },
  right_leg:     { kind: 'pivot' },

  left_forearm:  { kind: 'rotateParent' },
  right_forearm: { kind: 'rotateParent' },
  left_shin:     { kind: 'rotateParent' },
  right_shin:    { kind: 'rotateParent' },

  left_hand:     { kind: 'fabrik2' },
  right_hand:    { kind: 'fabrik2' },
  left_foot:     { kind: 'fabrik2' },
  right_foot:    { kind: 'fabrik2' },
};

function worldToLocal(wx, wy, frame) {
  const dx  = wx - frame.x, dy = wy - frame.y;
  const cos = Math.cos(frame.rotation), sin = Math.sin(frame.rotation);
  return { x: cos * dx + sin * dy, y: -sin * dx + cos * dy };
}

export function solveIK(currentOffsets, draggedBoneId, tx, ty) {
  const plan = IK_PLAN[draggedBoneId];
  if (!plan) return currentOffsets;

  const wt   = computeWorldTransforms(mergeOffsets({}, currentOffsets));
  const next = { ...currentOffsets };
  const bone = BONES[draggedBoneId];

  if (plan.kind === 'translate') {
    next[draggedBoneId] = {
      ...(next[draggedBoneId] || {}),
      x: tx - bone.localX,
      y: ty - bone.localY,
    };
    return next;
  }

  const parent = BONES[bone.parent];

  if (plan.kind === 'pivot') {
    const pw   = wt[parent.id];
    const eff  = effOffset(draggedBoneId, currentOffsets);
    const L    = Math.hypot(eff.x, eff.y);
    let dx = tx - pw.x, dy = ty - pw.y;
    const d = Math.hypot(dx, dy) || 1;
    dx = (dx / d) * L; dy = (dy / d) * L;
    const local = worldToLocal(pw.x + dx, pw.y + dy, pw);

    let lx = local.x, ly = local.y;
    if (plan.clamp) {
      const ang  = Math.atan2(ly, lx);
      let delta  = ang - plan.clamp.rest;
      while (delta >  Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      const c = Math.max(-plan.clamp.half, Math.min(plan.clamp.half, delta));
      if (c !== delta) {
        const a = plan.clamp.rest + c;
        lx = Math.cos(a) * L;
        ly = Math.sin(a) * L;
      }
    }

    next[draggedBoneId] = {
      ...(next[draggedBoneId] || {}),
      x: lx - bone.localX,
      y: ly - bone.localY,
    };
    return next;
  }

  if (plan.kind === 'rotateParent') {
    const pw          = wt[parent.id];
    const grandparent = BONES[parent.parent];
    const gpw         = grandparent ? wt[grandparent.id] : { x: 0, y: 0, rotation: 0 };
    const eff         = effOffset(draggedBoneId, currentOffsets);
    const L           = Math.hypot(eff.x, eff.y);

    let dx = tx - pw.x, dy = ty - pw.y;
    const d = Math.hypot(dx, dy) || 1;
    dx = (dx / d) * L; dy = (dy / d) * L;

    const desiredWorldRot = Math.atan2(dy, dx) - Math.atan2(eff.y, eff.x);
    const parentLocalRot  = desiredWorldRot - gpw.rotation;
    next[parent.id] = {
      ...(next[parent.id] || {}),
      rotation: parentLocalRot - parent.baseRotation,
    };
    return next;
  }

  // fabrik2: 2-segment chain. Pin the grandparent joint (shoulder/hip),
  // adjust grandparent + parent rotations so the dragged tip reaches target.
  const gpBone  = BONES[parent.parent];
  const ggpBone = BONES[gpBone.parent];
  const gpW     = wt[gpBone.id];
  const ggpW    = ggpBone ? wt[ggpBone.id] : { x: 0, y: 0, rotation: 0 };

  const parentEff = effOffset(parent.id, currentOffsets);
  const boneEff   = effOffset(draggedBoneId, currentOffsets);
  const L1 = Math.hypot(parentEff.x, parentEff.y);
  const L2 = Math.hypot(boneEff.x, boneEff.y);

  const j0  = { x: gpW.x, y: gpW.y };
  let target = { x: tx, y: ty };

  const dRaw = Math.hypot(target.x - j0.x, target.y - j0.y);
  if (dRaw < 1) return currentOffsets;

  const maxReach = (L1 + L2) * 0.999;
  const minReach = Math.abs(L1 - L2) + 0.01;
  let d = dRaw;
  if (d > maxReach) {
    const s = maxReach / d;
    target = { x: j0.x + (target.x - j0.x) * s, y: j0.y + (target.y - j0.y) * s };
    d = maxReach;
  } else if (d < minReach) {
    const s = minReach / d;
    target = { x: j0.x + (target.x - j0.x) * s, y: j0.y + (target.y - j0.y) * s };
    d = minReach;
  }

  // Cosine rule: angle at j0 in triangle (L1, L2, d).
  const cosAlpha = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const alpha    = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
  const baseAng  = Math.atan2(target.y - j0.y, target.x - j0.x);

  // Pick elbow-bend side from current pose so we don't flip mid-drag.
  const curElbow = wt[parent.id];
  const curTip   = wt[draggedBoneId];
  const cross    = (curTip.x - j0.x) * (curElbow.y - j0.y)
                 - (curTip.y - j0.y) * (curElbow.x - j0.x);
  const sign     = cross >= 0 ? 1 : -1;

  const elbowAng = baseAng + sign * alpha;
  const elbow    = { x: j0.x + L1 * Math.cos(elbowAng), y: j0.y + L1 * Math.sin(elbowAng) };
  const tip      = target;

  const gpDesiredWorldRot = Math.atan2(elbow.y - j0.y, elbow.x - j0.x)
                          - Math.atan2(parentEff.y, parentEff.x);
  const gpLocalRot = gpDesiredWorldRot - ggpW.rotation;
  next[gpBone.id] = {
    ...(next[gpBone.id] || {}),
    rotation: gpLocalRot - gpBone.baseRotation,
  };

  const parDesiredWorldRot = Math.atan2(tip.y - elbow.y, tip.x - elbow.x)
                           - Math.atan2(boneEff.y, boneEff.x);
  const parLocalRot = parDesiredWorldRot - gpDesiredWorldRot;
  next[parent.id] = {
    ...(next[parent.id] || {}),
    rotation: parLocalRot - parent.baseRotation,
  };

  return next;
}
