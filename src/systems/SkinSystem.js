/**
 * Skin system: each limb is defined as a list of control points anchored to
 * specific bones. When a bone rotates, its attached points (and their Bezier
 * handles) rotate with it, bending the continuous outline naturally at joints.
 *
 * Point format: [boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy]
 *   lx, ly      — anchor position in bone-local space
 *   hIn/hOut    — incoming/outgoing Bezier handle offsets FROM the anchor,
 *                 also in bone-local space (so they rotate with the bone)
 *
 * Points are listed clockwise starting from the top of the limb.
 */

// ─── Arms ────────────────────────────────────────────────────────────────────
// Bones: left_arm (shoulder) → left_forearm (elbow, localY=40) → left_hand (wrist, localY=40)
// At rest the arm hangs straight down; total visual length ~96px shoulder→fingertip.
//
// Width profile (shoulder-local y, wider oval silhouette):
//   y=0   shoulder:  16px  (−8 … +8)
//   y=16  upper arm: 44px  (−26 … +18)  ← widest
//   y=35  elbow:     42px  (−24 … +18)
//   y=60  forearm:   24px  (−13 … +11)
//   y=75  wrist:     14px  (−8 … +6)
//   y=96  fingertip:  0px  rounded

export const LEFT_ARM_SKIN = [
  // ── Outer (left / lateral) edge going DOWN ──────────────────────────────
  ['left_arm',       -8,   0,    3,  -7,   -5,  10],  // shoulder outer
  ['left_arm',      -26,  16,    0, -10,    0,  11],  // upper arm outer (widest)
  ['left_forearm',  -24,  -5,    0, -10,    0,   9],  // elbow outer
  ['left_forearm',  -13,  20,   -2,  -8,    1,   7],  // forearm outer
  ['left_hand',      -8,  -5,   -1,  -6,    2,   6],  // wrist outer
  // ── Hand tip ─────────────────────────────────────────────────────────────
  ['left_hand',       0,  16,   -7,   0,    7,   0],  // fingertip
  // ── Inner (right / medial) edge going UP ────────────────────────────────
  ['left_hand',       6,  -5,   -2,   6,    1,  -6],  // wrist inner
  ['left_forearm',   11,  20,    1,   7,   -2,  -7],  // forearm inner
  ['left_forearm',   18,  -5,    0,   9,    0,  -9],  // elbow inner
  ['left_arm',       18,  16,    0,  11,    0, -10],  // upper arm inner (widest)
  ['left_arm',        7,   0,    4,   8,   -3,  -7],  // shoulder inner
];

export const RIGHT_ARM_SKIN = [
  // ── Outer (right / lateral) edge going DOWN ─────────────────────────────
  ['right_arm',       8,   0,   -3,  -7,    5,  10],
  ['right_arm',      26,  16,    0, -10,    0,  11],
  ['right_forearm',  24,  -5,    0, -10,    0,   9],
  ['right_forearm',  13,  20,    2,  -8,   -1,   7],
  ['right_hand',      8,  -5,    1,  -6,   -2,   6],
  ['right_hand',      0,  16,    7,   0,   -7,   0],
  ['right_hand',     -6,  -5,    2,   6,   -1,  -6],
  ['right_forearm', -11,  20,   -1,   7,    2,  -7],
  ['right_forearm', -18,  -5,    0,   9,    0,  -9],
  ['right_arm',     -18,  16,    0,  11,    0, -10],
  ['right_arm',      -7,   0,   -4,   8,    3,  -7],
];

// ─── Legs ─────────────────────────────────────────────────────────────────────
// Bones: left_leg (hip) → left_shin (knee, localY=20) → left_foot (ankle, localY=20)
// Total visual length ~55px hip→foot tip.
//
// Width profile at rest (left_leg-local y):
//   y=0   hip top:   16px  (±8)
//   y=10  thigh:     30px  (−15 … +15)  ← widest
//   y=15  knee:      26px  (−13 … +13)
//   y=30  shin mid:  16px  (−8 … +8)
//   y=35  ankle:     12px  (−6 … +6)
//   y=55  foot tip:   0px  rounded

export const LEFT_LEG_SKIN = [
  // ── Outer (left) edge going DOWN ────────────────────────────────────────
  ['left_leg',       -8,   0,    3,  -6,   -3,   8],  // hip outer
  ['left_leg',      -15,  10,    0,  -8,    0,   9],  // thigh outer (widest)
  ['left_shin',     -13,  -5,    0,  -8,    0,   8],  // knee outer
  ['left_shin',      -8,  10,   -2,  -6,    1,   6],  // shin outer
  ['left_foot',      -6,   5,   -1,  -5,    2,   5],  // ankle outer
  // ── Foot tip ─────────────────────────────────────────────────────────────
  ['left_foot',       0,  15,   -6,   0,    6,   0],  // foot tip
  // ── Inner (right) edge going UP ─────────────────────────────────────────
  ['left_foot',       6,   5,   -1,   5,    1,  -5],  // ankle inner
  ['left_shin',       8,  10,    1,   6,   -2,  -6],  // shin inner
  ['left_shin',      13,  -5,    0,   8,    0,  -8],  // knee inner
  ['left_leg',       15,  10,    0,   9,    0,  -8],  // thigh inner (widest)
  ['left_leg',        8,   0,    3,   6,   -3,  -6],  // hip inner
];

export const RIGHT_LEG_SKIN = [
  ['right_leg',       8,   0,   -3,  -6,    3,   8],
  ['right_leg',      15,  10,    0,  -8,    0,   9],
  ['right_shin',     13,  -5,    0,  -8,    0,   8],
  ['right_shin',      8,  10,    2,  -6,   -1,   6],
  ['right_foot',      6,   5,    1,  -5,   -2,   5],
  ['right_foot',      0,  15,    6,   0,   -6,   0],
  ['right_foot',     -6,   5,    1,   5,   -1,  -5],
  ['right_shin',     -8,  10,   -1,   6,    2,  -6],
  ['right_shin',    -13,  -5,    0,   8,    0,  -8],
  ['right_leg',     -15,  10,    0,   9,    0,  -8],
  ['right_leg',      -8,   0,   -3,   6,    3,  -6],
];

// ─── Head ─────────────────────────────────────────────────────────────────────
// Circle radius 55 approximated with 4 Bézier points. k ≈ 55 × 0.552 = 30.
export const HEAD_SKIN = [
  ['head',  0, -55, -30,   0,  30,   0],  // top
  ['head', 55,   0,   0, -30,   0,  30],  // right
  ['head',  0,  55,  30,   0, -30,   0],  // bottom
  ['head',-55,   0,   0,  30,   0, -30],  // left
];

// ─── Upper torso ──────────────────────────────────────────────────────────────
// Trapezoid: top (54px wide) tapering to bottom (44px wide), height 50px.
// Clockwise: top-left → top-right → bottom-right → bottom-left.
export const BODY_SKIN = [
  ['torso', -27, -22,   2,  17,  18,   0],  // top-left
  ['torso',  27, -22, -18,   0,  -2,  17],  // top-right
  ['torso',  22,  28,   2, -17, -15,   0],  // bottom-right
  ['torso', -22,  28,  15,   0,  -2, -17],  // bottom-left
];

// ─── Lower torso ──────────────────────────────────────────────────────────────
// Rounded rect: x ∈ [−30, 30], y ∈ [−12, 8] (center at y = −2).
// 4 edge-centre points with handles creating gentle rounding.
export const LOWER_TORSO_SKIN = [
  ['lower_torso',  0, -12, -20,   0,  20,   0],  // top centre
  ['lower_torso', 30,  -2,   0,  -7,   0,   7],  // right centre
  ['lower_torso',  0,   8,  20,   0, -20,   0],  // bottom centre
  ['lower_torso',-30,  -2,   0,   7,   0,  -7],  // left centre
];

// ─── Renderer ────────────────────────────────────────────────────────────────

function rotateOffset(dx, dy, rotation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { x: cos * dx - sin * dy, y: sin * dx + cos * dy };
}

/**
 * Transforms all skin control points to world space using the bone world
 * transforms, then strokes the closed Bezier outline.
 */
export function drawSkin(ctx, template, worldTransforms, color, scale = 1) {
  const pts = template.map(([boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy]) => {
    const bone = worldTransforms[boneId];
    const a  = rotateOffset(lx * scale, ly * scale, bone.rotation);
    const ax = bone.x + a.x;
    const ay = bone.y + a.y;

    const hi = rotateOffset(hInDx * scale,  hInDy * scale,  bone.rotation);
    const ho = rotateOffset(hOutDx * scale, hOutDy * scale, bone.rotation);

    return {
      x: ax, y: ay,
      hIn:  { x: ax + hi.x, y: ay + hi.y },
      hOut: { x: ax + ho.x, y: ay + ho.y },
    };
  });

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    ctx.bezierCurveTo(prev.hOut.x, prev.hOut.y, curr.hIn.x, curr.hIn.y, curr.x, curr.y);
  }

  // Close back to first point
  const last  = pts[pts.length - 1];
  const first = pts[0];
  ctx.bezierCurveTo(last.hOut.x, last.hOut.y, first.hIn.x, first.hIn.y, first.x, first.y);

  ctx.fill();
}
