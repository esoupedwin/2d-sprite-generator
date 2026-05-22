/**
 * Vector overlay: anchor points + Bézier handles for every skin template.
 *
 * Each skin point: [boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy]
 *   lx, ly       — anchor in bone-local space
 *   hIn / hOut   — handle offsets FROM the anchor, also bone-local
 *
 * The overlay is drawn inside the character transform (translate + scale),
 * so all coordinates are in character-local space (same as worldTransforms).
 */

import {
  LEFT_ARM_SKIN, RIGHT_ARM_SKIN, LEFT_LEG_SKIN, RIGHT_LEG_SKIN,
  HEAD_SKIN, BODY_SKIN,
} from './SkinSystem.js';
import { rotateOffset, worldToLocal } from '../utils/mathUtils.js';

export const DEFAULT_SKINS = {
  head:        HEAD_SKIN,
  body:        BODY_SKIN,
  left_arm:    LEFT_ARM_SKIN,
  right_arm:   RIGHT_ARM_SKIN,
  left_leg:    LEFT_LEG_SKIN,
  right_leg:   RIGHT_LEG_SKIN,
};

// Bones a new point may anchor to, per skin. Prevents accidentally
// attaching e.g. a body point to left_leg when ctrl+clicking near the hip.
const ALLOWED_BONES = {
  head:      ['head'],
  body:      ['torso', 'lower_torso'],
  left_arm:  ['left_arm', 'left_forearm', 'left_hand'],
  right_arm: ['right_arm', 'right_forearm', 'right_hand'],
  left_leg:  ['left_leg', 'left_shin', 'left_foot'],
  right_leg: ['right_leg', 'right_shin', 'right_foot'],
};

// Colour per skin — used in overlay and in the part-selector UI
export const SKIN_COLORS = {
  head:        { anchor: '#f43f5e', handle: '#fb7185', stem: 'rgba(244,63,94,0.5)',    label: 'Head'   },
  body:        { anchor: '#818cf8', handle: '#a5b4fc', stem: 'rgba(129,140,248,0.5)',  label: 'Body'   },
  left_arm:    { anchor: '#4ade80', handle: '#86efac', stem: 'rgba(74,222,128,0.5)',   label: 'L. Arm' },
  right_arm:   { anchor: '#c084fc', handle: '#d8b4fe', stem: 'rgba(192,132,252,0.5)',  label: 'R. Arm' },
  left_leg:    { anchor: '#fb923c', handle: '#fdba74', stem: 'rgba(251,146,60,0.5)',   label: 'L. Leg' },
  right_leg:   { anchor: '#38bdf8', handle: '#7dd3fc', stem: 'rgba(56,189,248,0.5)',   label: 'R. Leg' },
};

// Base sizes in character-local units at zoom=1; callers pass visualScale=1/zoom
// so these stay constant in screen-pixel size at every zoom level.
const ANCHOR_HALF_BASE = 1.75;
const HANDLE_R_BASE    = 2.5 / 1.5;
const ACTIVE_COLOR     = '#ffd700';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return the effective template for a skin key (override → default fallback). */
export function getSkin(skinKey, overrides) {
  return overrides[skinKey] ?? DEFAULT_SKINS[skinKey];
}

// ── Rendering + hit targets ───────────────────────────────────────────────────

/**
 * Draws the vector overlay and returns hit-testable targets in character-local space.
 *
 * @param selectedSkin  'all' | one of the DEFAULT_SKINS keys
 * @param visualScale   1 / zoom — keeps anchors/handles a constant screen size
 */
export function renderVectorOverlay(
  ctx,
  worldTransforms,
  skinOverrides,
  activeTarget,
  selectedSkin = 'all',
  visualScale  = 1,
) {
  const keysToRender = selectedSkin === 'all'
    ? Object.keys(DEFAULT_SKINS)
    : [selectedSkin];

  const anchorH = ANCHOR_HALF_BASE * visualScale;
  const handleR = HANDLE_R_BASE    * visualScale;
  const hitTargets = [];

  for (const skinKey of keysToRender) {
    const template = getSkin(skinKey, skinOverrides);
    const colors   = SKIN_COLORS[skinKey];

    for (let pi = 0; pi < template.length; pi++) {
      const [boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy] = template[pi];
      const bone = worldTransforms[boneId];
      if (!bone) continue;

      const r  = bone.rotation;
      const a  = rotateOffset(lx, ly, r);
      const ax = bone.x + a.x,  ay = bone.y + a.y;

      const hi  = rotateOffset(hInDx,  hInDy,  r);
      const hix = ax + hi.x,  hiy = ay + hi.y;

      const ho  = rotateOffset(hOutDx, hOutDy, r);
      const hox = ax + ho.x,  hoy = ay + ho.y;

      const isAnchorActive = activeTarget?.skinKey === skinKey && activeTarget.pointIndex === pi && activeTarget.type === 'anchor';
      const isHInActive    = activeTarget?.skinKey === skinKey && activeTarget.pointIndex === pi && activeTarget.type === 'handleIn';
      const isHOutActive   = activeTarget?.skinKey === skinKey && activeTarget.pointIndex === pi && activeTarget.type === 'handleOut';

      // Stems: dashed lines anchor → handles
      ctx.save();
      ctx.strokeStyle = colors.stem;
      ctx.lineWidth   = 0.6 * visualScale;
      ctx.setLineDash([1.5 * visualScale, 1.5 * visualScale]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hix, hiy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(hox, hoy); ctx.stroke();
      ctx.restore(); // resets lineDash

      // Handle In (circle)
      ctx.fillStyle = isHInActive ? ACTIVE_COLOR : colors.handle;
      ctx.beginPath();
      ctx.arc(hix, hiy, isHInActive ? handleR * 1.6 : handleR, 0, Math.PI * 2);
      ctx.fill();

      // Handle Out (circle)
      ctx.fillStyle = isHOutActive ? ACTIVE_COLOR : colors.handle;
      ctx.beginPath();
      ctx.arc(hox, hoy, isHOutActive ? handleR * 1.6 : handleR, 0, Math.PI * 2);
      ctx.fill();

      // Anchor (square with thin border)
      const hs = isAnchorActive ? anchorH * 1.6 : anchorH;
      ctx.fillStyle = isAnchorActive ? ACTIVE_COLOR : colors.anchor;
      ctx.fillRect(ax - hs, ay - hs, hs * 2, hs * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth   = 0.4 * visualScale;
      ctx.strokeRect(ax - hs, ay - hs, hs * 2, hs * 2);

      hitTargets.push({ type: 'anchor',    skinKey, pointIndex: pi, x: ax,  y: ay  });
      hitTargets.push({ type: 'handleIn',  skinKey, pointIndex: pi, x: hix, y: hiy });
      hitTargets.push({ type: 'handleOut', skinKey, pointIndex: pi, x: hox, y: hoy });
    }
  }

  return hitTargets;
}

/**
 * Draws a thin line from each visible skin anchor to the joint it's bound to.
 * Helps users see which bone owns each control point.
 */
export function renderBoneBinds(ctx, worldTransforms, skinOverrides, selectedSkin = 'all', visualScale = 1) {
  const keysToRender = selectedSkin === 'all'
    ? Object.keys(DEFAULT_SKINS)
    : [selectedSkin];

  ctx.save();
  ctx.lineWidth = 0.5 * visualScale;
  for (const skinKey of keysToRender) {
    const template = getSkin(skinKey, skinOverrides);
    const colors   = SKIN_COLORS[skinKey];
    if (!colors) continue;
    ctx.strokeStyle = colors.stem;
    for (let pi = 0; pi < template.length; pi++) {
      const [boneId, lx, ly] = template[pi];
      const bone = worldTransforms[boneId];
      if (!bone) continue;
      const a  = rotateOffset(lx, ly, bone.rotation);
      const ax = bone.x + a.x, ay = bone.y + a.y;
      ctx.beginPath();
      ctx.moveTo(bone.x, bone.y);
      ctx.lineTo(ax, ay);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── Mutation ──────────────────────────────────────────────────────────────────

/** World position of a skin anchor given the bone's world transform. */
function anchorWorld(pt, bone) {
  const [, lx, ly] = pt;
  const r = rotateOffset(lx, ly, bone.rotation);
  return { x: bone.x + r.x, y: bone.y + r.y };
}

/**
 * Inserts a new control point into a skin at the click position (character-local).
 * The new point is anchored to the closest bone joint.
 * Insertion index is chosen so the new point sits between the nearest pair of
 * consecutive anchors (minimises visual disruption to the existing shape).
 */
export function addSkinPoint(skinOverrides, skinKey, worldTransforms, wx, wy) {
  const src = getSkin(skinKey, skinOverrides);

  // Closest bone joint to the click — restricted to bones valid for this skin
  // so e.g. a body point can't accidentally anchor to a leg bone.
  const allowed = ALLOWED_BONES[skinKey];
  let closestBoneId = null, minBoneDist = Infinity;
  for (const [boneId, bone] of Object.entries(worldTransforms)) {
    if (allowed && !allowed.includes(boneId)) continue;
    const d = Math.hypot(bone.x - wx, bone.y - wy);
    if (d < minBoneDist) { minBoneDist = d; closestBoneId = boneId; }
  }
  if (!closestBoneId) return skinOverrides;

  // Bone-local coordinates of the click
  const bone  = worldTransforms[closestBoneId];
  const local = worldToLocal(wx, wy, bone);

  // Find insertion index: between the consecutive pair whose midpoint is nearest
  const n = src.length;
  let insertIdx = n;
  let minSegDist = Infinity;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const boneA = worldTransforms[src[i][0]];
    const boneB = worldTransforms[src[j][0]];
    if (!boneA || !boneB) continue;
    const A = anchorWorld(src[i], boneA);
    const B = anchorWorld(src[j], boneB);
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    const d = Math.hypot(wx - mx, wy - my);
    if (d < minSegDist) { minSegDist = d; insertIdx = i + 1; }
  }

  // Compute handles pointing toward neighbouring anchors at 1/3 distance
  const prevPt   = src[(insertIdx - 1 + n) % n];
  const nextPt   = src[insertIdx % n];
  const prevBone = worldTransforms[prevPt[0]];
  const nextBone = worldTransforms[nextPt[0]];

  let hInDx = 0, hInDy = 0, hOutDx = 0, hOutDy = 0;
  if (prevBone && nextBone) {
    const prev = anchorWorld(prevPt, prevBone);
    const next = anchorWorld(nextPt, nextBone);

    const toPrevX = prev.x - wx, toPrevY = prev.y - wy;
    const toNextX = next.x - wx, toNextY = next.y - wy;
    const distPrev = Math.hypot(toPrevX, toPrevY);
    const distNext = Math.hypot(toNextX, toNextY);

    // World-space handle offsets — 1/3 of distance toward each neighbour
    const hInWx  = distPrev > 0 ? (toPrevX / distPrev) * (distPrev / 3) : 0;
    const hInWy  = distPrev > 0 ? (toPrevY / distPrev) * (distPrev / 3) : 0;
    const hOutWx = distNext > 0 ? (toNextX / distNext) * (distNext / 3) : 0;
    const hOutWy = distNext > 0 ? (toNextY / distNext) * (distNext / 3) : 0;

    // Rotate world-space offsets into bone-local space (inverse of bone rotation)
    const cos = Math.cos(bone.rotation), sin = Math.sin(bone.rotation);
    hInDx  =  cos * hInWx  + sin * hInWy;
    hInDy  = -sin * hInWx  + cos * hInWy;
    hOutDx =  cos * hOutWx + sin * hOutWy;
    hOutDy = -sin * hOutWx + cos * hOutWy;
  }

  const template = src.map(pt => [...pt]);
  template.splice(insertIdx, 0, [closestBoneId, local.x, local.y, hInDx, hInDy, hOutDx, hOutDy]);
  return { ...skinOverrides, [skinKey]: template };
}

/**
 * Removes the control point at `pointIndex` from `skinKey`. Keeps a minimum of
 * 3 points so the closed Bezier outline still renders.
 */
export function deleteSkinPoint(skinOverrides, skinKey, pointIndex) {
  const src = getSkin(skinKey, skinOverrides);
  if (!src || src.length <= 3) return skinOverrides;
  const template = src.filter((_, i) => i !== pointIndex);
  return { ...skinOverrides, [skinKey]: template };
}

/**
 * Re-anchors a skin point to the closest allowed bone joint at world (wx, wy).
 * Bone-local coords for the anchor and handles are recomputed so that:
 *   - the anchor lands at (wx, wy)
 *   - the world directions of the Bezier handles are preserved
 * Returns a new skinOverrides object (or the original if no valid bone found).
 */
export function rebindSkinPoint(skinOverrides, skinKey, pointIndex, worldTransforms, wx, wy) {
  const allowed = ALLOWED_BONES[skinKey];
  let newBoneId = null, minD = Infinity;
  for (const [boneId, bone] of Object.entries(worldTransforms)) {
    if (allowed && !allowed.includes(boneId)) continue;
    const d = Math.hypot(bone.x - wx, bone.y - wy);
    if (d < minD) { minD = d; newBoneId = boneId; }
  }
  if (!newBoneId) return skinOverrides;

  const src      = getSkin(skinKey, skinOverrides);
  const template = src.map(pt => [...pt]);
  const [oldBoneId, , , hInDx, hInDy, hOutDx, hOutDy] = template[pointIndex];

  const oldBone = worldTransforms[oldBoneId];
  const newBone = worldTransforms[newBoneId];
  if (!newBone) return skinOverrides;

  // Anchor in new bone's local frame so the world position equals (wx, wy).
  const local  = worldToLocal(wx, wy, newBone);

  // Rotate handles from old bone-local space into new bone-local space so
  // the world-space handle directions stay the same after the rebind.
  const oldR = oldBone ? oldBone.rotation : 0;
  const dr   = oldR - newBone.rotation;
  const cos  = Math.cos(dr), sin = Math.sin(dr);
  const newHIn  = { x: cos * hInDx  - sin * hInDy,  y: sin * hInDx  + cos * hInDy  };
  const newHOut = { x: cos * hOutDx - sin * hOutDy, y: sin * hOutDx + cos * hOutDy };

  template[pointIndex] = [
    newBoneId, local.x, local.y,
    newHIn.x,  newHIn.y,
    newHOut.x, newHOut.y,
  ];
  return { ...skinOverrides, [skinKey]: template };
}

/**
 * Returns a new skinOverrides object with one control point updated.
 * update: { type:'anchor', lx, ly }
 *       | { type:'handleIn'|'handleOut', dx, dy, mirror? }
 *
 * `mirror: true` keeps the opposite handle colinear through the anchor
 * (preserving its current length) so the curve stays smooth at this point.
 */
export function updateSkinPoint(skinOverrides, skinKey, pointIndex, update) {
  const src      = getSkin(skinKey, skinOverrides);
  const template = src.map(pt => [...pt]);
  const [boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy] = template[pointIndex];

  if (update.type === 'anchor') {
    template[pointIndex] = [boneId, update.lx, update.ly, hInDx, hInDy, hOutDx, hOutDy];
  } else if (update.type === 'handleIn') {
    let outDx = hOutDx, outDy = hOutDy;
    if (update.mirror) {
      const inLen  = Math.hypot(update.dx, update.dy);
      const outLen = Math.hypot(hOutDx, hOutDy) || inLen;
      if (inLen > 0) {
        outDx = -update.dx / inLen * outLen;
        outDy = -update.dy / inLen * outLen;
      }
    }
    template[pointIndex] = [boneId, lx, ly, update.dx, update.dy, outDx, outDy];
  } else if (update.type === 'handleOut') {
    let inDx = hInDx, inDy = hInDy;
    if (update.mirror) {
      const outLen = Math.hypot(update.dx, update.dy);
      const inLen  = Math.hypot(hInDx, hInDy) || outLen;
      if (outLen > 0) {
        inDx = -update.dx / outLen * inLen;
        inDy = -update.dy / outLen * inLen;
      }
    }
    template[pointIndex] = [boneId, lx, ly, inDx, inDy, update.dx, update.dy];
  }

  return { ...skinOverrides, [skinKey]: template };
}
