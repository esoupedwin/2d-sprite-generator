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

// ─── Torso (combined upper + lower) ──────────────────────────────────────────
// Single continuous outline so the lower torso bends with the upper at the
// waist instead of detaching when the lower_torso bone rotates.
//   Shoulders → waist  : anchored to `torso`  (top stays put)
//   Waist     → bottom : anchored to `lower_torso` (rotates with the bone)
// The waist transition points sit exactly on the lower_torso joint, so the
// silhouette bends smoothly there at any rotation.
export const BODY_SKIN = [
  ['torso',        -27, -22,   2,  17,  18,   0],  // top-left shoulder
  ['torso',         27, -22, -18,   0,  -2,  17],  // top-right shoulder
  ['lower_torso',   22,   0,   2, -17,   8,   0],  // right waist (joint)
  ['lower_torso',   30,  -2,   0,  -7,   0,   7],  // right hip
  ['lower_torso',    0,   8,  20,   0, -20,   0],  // bottom
  ['lower_torso',  -30,  -2,   0,   7,   0,  -7],  // left hip
  ['lower_torso',  -22,   0,  -8,   0,  -2, -17],  // left waist (joint)
];

// Retained for backward compatibility with saved skinOverrides.lower_torso —
// new characters render the lower torso as part of BODY_SKIN.
export const LOWER_TORSO_SKIN = [];

// ─── Renderer ────────────────────────────────────────────────────────────────

function rotateOffset(dx, dy, rotation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { x: cos * dx - sin * dy, y: sin * dx + cos * dy };
}

function buildSkinPath(ctx, template, worldTransforms, scale) {
  const pts = template.map(([boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy]) => {
    const bone = worldTransforms[boneId];
    if (!bone) return null;
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
  if (pts.some(p => !p)) return false;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    ctx.bezierCurveTo(prev.hOut.x, prev.hOut.y, curr.hIn.x, curr.hIn.y, curr.x, curr.y);
  }
  const last  = pts[pts.length - 1];
  const first = pts[0];
  ctx.bezierCurveTo(last.hOut.x, last.hOut.y, first.hIn.x, first.hIn.y, first.x, first.y);
  return true;
}

/**
 * Transforms all skin control points to world space using the bone world
 * transforms, then fills the closed Bezier outline.
 */
export function drawSkin(ctx, template, worldTransforms, color, scale = 1) {
  if (!template || template.length === 0) return;
  if (!buildSkinPath(ctx, template, worldTransforms, scale)) return;
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Strokes the same Bezier outline as drawSkin without filling — used as a
 * visual aid while editing vectors so the user can see the part's contour
 * over the rendered character.
 */
export function strokeSkinOutline(ctx, template, worldTransforms, color, lineWidth, scale = 1) {
  if (!template || template.length === 0) return;
  if (!buildSkinPath(ctx, template, worldTransforms, scale)) return;
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth;
  ctx.stroke();
}

/**
 * Computes the world-space bounding box of a skin template after applying
 * the given world transforms and scale. Includes Bezier handles so the
 * curve never extends past the box.
 */
export function computeSkinBounds(template, worldTransforms, scale = 1) {
  if (!template || template.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy] of template) {
    const bone = worldTransforms[boneId];
    if (!bone) return null;
    const a  = rotateOffset(lx * scale, ly * scale, bone.rotation);
    const ax = bone.x + a.x, ay = bone.y + a.y;
    const hi = rotateOffset(hInDx * scale,  hInDy * scale,  bone.rotation);
    const ho = rotateOffset(hOutDx * scale, hOutDy * scale, bone.rotation);
    for (const [x, y] of [[ax, ay], [ax + hi.x, ay + hi.y], [ax + ho.x, ay + ho.y]]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Same closed Bezier outline as drawSkin, but filled with an image clipped
 * to the path. The image is stretched to the skin's bounding box so it
 * deforms when the underlying bones move.
 */
export function drawSkinImage(ctx, template, worldTransforms, image, scale = 1) {
  if (!template || template.length === 0) return;
  if (!image || !image.complete || image.naturalWidth === 0) return;
  const bounds = computeSkinBounds(template, worldTransforms, scale);
  if (!bounds) return;
  ctx.save();
  if (!buildSkinPath(ctx, template, worldTransforms, scale)) { ctx.restore(); return; }
  ctx.clip();
  ctx.drawImage(image, bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.restore();
}

/**
 * Pins an image to a single-bone skin (e.g. HEAD_SKIN). The image is sized
 * to the skin's bone-local bounding box and rotates with the bone, but is
 * NOT clipped — the full PNG covers the area. Used to replace a skin blob
 * with a custom texture.
 */
export function drawSkinPinned(ctx, template, worldTransforms, image, scale = 1) {
  if (!template || template.length === 0) return;
  if (!image || !image.complete || image.naturalWidth === 0) return;
  const boneId = template[0][0];
  const bone   = worldTransforms[boneId];
  if (!bone) return;

  // Bounds of all anchors + handles in BONE-LOCAL space.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [, lx, ly, hInDx, hInDy, hOutDx, hOutDy] of template) {
    const pts = [
      [lx, ly],
      [lx + hInDx,  ly + hInDy],
      [lx + hOutDx, ly + hOutDy],
    ];
    for (const [x, y] of pts) {
      const sx = x * scale, sy = y * scale;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }
  }
  if (minX === Infinity) return;

  // Preserve the image's aspect ratio (contain): scale uniformly to fit
  // inside the bounding box and center any leftover space.
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const fit  = Math.min(boxW / image.naturalWidth, boxH / image.naturalHeight);
  const drawW = image.naturalWidth  * fit;
  const drawH = image.naturalHeight * fit;
  const drawX = minX + (boxW - drawW) / 2;
  const drawY = minY + (boxH - drawH) / 2;

  ctx.save();
  ctx.translate(bone.x, bone.y);
  ctx.rotate(bone.rotation);
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();
}
