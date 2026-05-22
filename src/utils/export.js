import { ANIMATIONS, getPoseAtTime, resolveAnimation } from '../systems/AnimationSystem.js';
import { BONES, computeWorldTransforms } from '../systems/SkeletonSystem.js';
import {
  computeSkinBounds,
  HEAD_SKIN, BODY_SKIN,
  LEFT_ARM_SKIN, RIGHT_ARM_SKIN,
  LEFT_LEG_SKIN, RIGHT_LEG_SKIN,
} from '../systems/SkinSystem.js';
import { DEFAULT_SKINS, getSkin } from '../systems/VectorEditor.js';
import { renderCharacter, renderPartGroup } from '../systems/Renderer.js';
import { CHARACTER_PARTS } from '../data/characterParts.js';
import { mergeOffsets } from './transforms.js';
import {
  FRAME_W, FRAME_H, FRAME_ORIGIN_X, FRAME_ORIGIN_Y, FRAME_SCALE,
  SHEET_COLS, DEFAULT_FRAMES,
} from './spriteExportConfig.js';

// Oversample factor — the backing canvas is this many times larger than the
// nominal sprite size. Drawing math stays in nominal units (we apply
// ctx.scale once), so curves rasterize at higher pixel density and edges
// come out crisp instead of stair-stepped.
const EXPORT_PIXEL_RATIO = 2;

// Per-animation head PNG override falls back to the character-wide head
// PNG. Mirrors the live-canvas resolution in CharacterCanvas.jsx.
function resolveHeadUrl(parts, animationName) {
  return parts?.animHeadImages?.[animationName] ?? parts?.headImage ?? null;
}

// Decode a data-URL/asset URL into an HTMLImageElement. Returns null on
// missing/failed loads so the rest of the export keeps going.
function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Resolves the animation definition and stacks the character's persistent
// bone offsets (rest-pose + per-animation). Returns null when the animation
// can't be found, so callers can early-return cleanly.
function resolveAnimWithOffsets(character, animationName) {
  const rawAnim = ANIMATIONS[animationName]
    ?? character.customAnimations?.find(a => a.id === animationName);
  if (!rawAnim) return null;
  const anim = resolveAnimation(rawAnim, character.animKeyframeOverrides?.[animationName] ?? null);
  const animSpecificOff   = (character.animBoneOffsets ?? {})[animationName] ?? {};
  const neckLen = character.parts?.neckLength;
  const neckOff = neckLen != null ? { head: { y: Math.abs(BONES.head.localY) - neckLen } } : {};
  const persistentOffsets = mergeOffsets(mergeOffsets(character.boneOffsets ?? {}, animSpecificOff), neckOff);
  return { anim, persistentOffsets };
}

// Preloads body/head/weapon PNGs and builds the skin-template map.
// Returns synchronously-usable HTMLImageElements (or null on load failure)
// plus the resolved `parts` and `skins` objects.
async function loadRenderAssets(character, animationName) {
  const skinOverrides = character.skinOverrides ?? {};
  const skins = {};
  for (const key of Object.keys(DEFAULT_SKINS)) skins[key] = getSkin(key, skinOverrides);
  const parts = character.parts ?? {};
  const [bodyImage, headImage, weaponImage] = await Promise.all([
    loadImage(parts.bodyImage),
    loadImage(resolveHeadUrl(parts, animationName)),
    loadImage(parts.weaponImages?.[parts.weapon]),
  ]);
  return { skins, parts, bodyImage, headImage, weaponImage };
}

/**
 * Renders every frame of an animation into a sprite sheet canvas. Used by
 * both the PNG export and the in-app preview dialog. Returns null if the
 * animation can't be resolved. Output matches what's drawn live on the canvas:
 *  - animation keyframe curves (with per-keyframe overrides applied)
 *  - character rest-pose `boneOffsets`
 *  - per-animation `animBoneOffsets` for the current animation
 *  - vector `skinOverrides` (skin overlay)
 *  - body/head/weapon PNG reskins
 *  - custom animations on the character
 *  - per-weapon offset/scale and per-(weapon×animation) anchor offsets
 *
 * `drawGrid` defaults to false — pass `true` for the in-app preview to draw
 * faint frame borders. The PNG export keeps it false so the saved file has
 * no decoration baked into the sprite cells.
 *
 * Returns: {
 *   canvas, name,
 *   frameW, frameH, frameCount, cols, rows,
 *   pixelRatio,        // oversample factor applied to the canvas buffer
 *   duration, loop,    // for playback timing in the preview
 * }
 */
export async function buildSpriteSheet(character, animationName, { frameCount = DEFAULT_FRAMES, drawGrid = false, partsFilter = 'all' } = {}) {
  if (!character) return null;

  // Resolve animation + persistent offsets; preload PNGs and build skin map.
  // Per-keyframe overrides are folded in via resolveAnimation so exported
  // frames match the live preview. Ragdoll overlay is ephemeral and excluded.
  const resolved = resolveAnimWithOffsets(character, animationName);
  if (!resolved) return null;
  const { anim, persistentOffsets } = resolved;
  const { skins, parts, bodyImage, headImage, weaponImage } = await loadRenderAssets(character, animationName);

  const cols = Math.min(frameCount, SHEET_COLS);
  const rows = Math.ceil(frameCount / cols);

  const canvas = document.createElement('canvas');
  canvas.width  = FRAME_W * cols * EXPORT_PIXEL_RATIO;
  canvas.height = FRAME_H * rows * EXPORT_PIXEL_RATIO;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(EXPORT_PIXEL_RATIO, EXPORT_PIXEL_RATIO);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (drawGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
  }

  for (let i = 0; i < frameCount; i++) {
    const t = (i / frameCount) * anim.duration;
    const animPose       = getPoseAtTime(anim, t);
    const fullPose       = mergeOffsets(animPose, persistentOffsets);
    const worldTransforms = computeWorldTransforms(fullPose);

    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = col * FRAME_W;
    const oy = row * FRAME_H;

    if (drawGrid) ctx.strokeRect(ox, oy, FRAME_W, FRAME_H);

    ctx.save();
    ctx.translate(ox, oy);
    renderCharacter(ctx, parts, worldTransforms, {
      originX:   FRAME_ORIGIN_X,
      originY:   FRAME_ORIGIN_Y,
      scale:     FRAME_SCALE,
      skins,
      animation: animationName,
      bodyImage,
      headImage,
      weaponImage,
      partsFilter,
    });
    ctx.restore();
  }

  return {
    canvas,
    name: anim.name ?? animationName,
    frameW: FRAME_W,
    frameH: FRAME_H,
    frameCount,
    cols,
    rows,
    pixelRatio: EXPORT_PIXEL_RATIO,
    duration: anim.duration,
    loop: anim.loop !== false,
  };
}

/**
 * Builds the sprite sheet (no in-frame grid lines) and triggers a PNG
 * download via an object URL. When `opts.split === true`, exports TWO
 * PNGs at identical frame coords: one without legs and one with just the
 * legs — overlay them in your downstream tool to reconstruct the character.
 */
export async function exportSpriteSheet(character, animationName, opts = {}) {
  const { split = false, ...sheetOpts } = opts;
  const safeName = String(animationName).replace(/[^a-z0-9_-]/gi, '_');

  if (!split) {
    const sheet = await buildSpriteSheet(character, animationName, sheetOpts);
    if (!sheet) return;
    await downloadCanvas(sheet.canvas, `${safeName}_spritesheet.png`);
    return;
  }

  // Split mode: render the two halves at the same frame coords.
  const body = await buildSpriteSheet(character, animationName, { ...sheetOpts, partsFilter: 'no-legs' });
  const legs = await buildSpriteSheet(character, animationName, { ...sheetOpts, partsFilter: 'legs-only' });
  if (body) await downloadCanvas(body.canvas, `${safeName}_spritesheet_body.png`);
  if (legs) await downloadCanvas(legs.canvas, `${safeName}_spritesheet_legs.png`);
}

function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(); return; }
      const url = URL.createObjectURL(blob);
      download(url, filename);
      // Give the download click time to start, then release the blob URL.
      setTimeout(() => { URL.revokeObjectURL(url); resolve(); }, 1000);
    }, 'image/png');
  });
}

const POSE_W = 320;
const POSE_H = 480;
const POSE_ORIGIN_X = POSE_W / 2;
const POSE_ORIGIN_Y = POSE_H - 60;
const POSE_SCALE = 2.0;
const POSE_PIXEL_RATIO = 3;

/**
 * Renders the current pose (one frame at `currentTime`) to a transparent-
 * background canvas, then wraps the PNG in an SVG and triggers download.
 * The SVG preserves the correct aspect ratio so it scales without distortion.
 */
export async function exportPoseSVG(character, animationName, currentTime = 0) {
  if (!character) return;

  const resolved = resolveAnimWithOffsets(character, animationName);
  if (!resolved) return;
  const { anim, persistentOffsets } = resolved;

  const t = currentTime % anim.duration;
  const worldTransforms = computeWorldTransforms(mergeOffsets(getPoseAtTime(anim, t), persistentOffsets));

  const { skins, parts, bodyImage, headImage, weaponImage } = await loadRenderAssets(character, animationName);

  const canvas = document.createElement('canvas');
  canvas.width  = POSE_W * POSE_PIXEL_RATIO;
  canvas.height = POSE_H * POSE_PIXEL_RATIO;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(POSE_PIXEL_RATIO, POSE_PIXEL_RATIO);

  renderCharacter(ctx, parts, worldTransforms, {
    originX: POSE_ORIGIN_X,
    originY: POSE_ORIGIN_Y,
    scale:   POSE_SCALE,
    skins,
    animation: animationName,
    bodyImage,
    headImage,
    weaponImage,
  });

  const pngDataUrl = canvas.toDataURL('image/png');
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    ` width="${POSE_W}" height="${POSE_H}" viewBox="0 0 ${POSE_W} ${POSE_H}">`,
    `<image width="${POSE_W}" height="${POSE_H}" xlink:href="${pngDataUrl}"/>`,
    `</svg>`,
  ].join('');

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  const name = animationName.replace(/[^a-z0-9_-]/gi, '_');
  download(url, `${name}_pose.svg`);
  URL.revokeObjectURL(url);
}

/**
 * Exports the resolved animation track data as JSON, including the
 * character's per-keyframe overrides if any.
 */
export function exportAnimationJSON(character, animationName) {
  const rawAnim = ANIMATIONS[animationName]
    ?? character?.customAnimations?.find(a => a.id === animationName);
  if (!rawAnim) return;

  const animKeyframeOverrides = character?.animKeyframeOverrides?.[animationName] ?? null;
  const anim = resolveAnimation(rawAnim, animKeyframeOverrides);

  const payload = {
    name: anim.name ?? animationName,
    duration: anim.duration,
    loop: anim.loop,
    tracks: anim.tracks,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  download(url, `${animationName}_animation.json`);
  URL.revokeObjectURL(url);
}

// ─── Parts sheet SVG ──────────────────────────────────────────────────────────

const SHEET_SCALE  = 2.5;   // character-local units → canvas pixels
const SHEET_PR     = 3;     // pixel ratio for each part's backing canvas
const SHEET_MARGIN = 22;    // char-local padding around each part's bounds
const SHEET_GAP    = 28;    // SVG pixels between parts
const SHEET_LABEL  = 18;    // SVG pixels reserved for the text label

const SHEET_GROUPS = [
  { id: 'head',      label: 'Head'      },
  { id: 'body',      label: 'Torso'     },
  { id: 'right_arm', label: 'Back Arm'  },
  { id: 'left_arm',  label: 'Front Arm' },
  { id: 'right_leg', label: 'Back Leg'  },
  { id: 'left_leg',  label: 'Front Leg' },
  { id: 'weapon',    label: null        }, // label set at runtime from parts
];

function groupBounds(groupId, parts, worldTransforms, skins) {
  const ps = key => parts.partScales?.[key] ?? 1;
  switch (groupId) {
    case 'head':
      return computeSkinBounds(skins.head || HEAD_SKIN, worldTransforms, ps('head'));
    case 'body':
      return computeSkinBounds(skins.body || BODY_SKIN, worldTransforms, ps('body'));
    case 'right_arm':
      return computeSkinBounds(skins.right_arm || RIGHT_ARM_SKIN, worldTransforms, ps('right_arm'));
    case 'left_arm':
      return computeSkinBounds(skins.left_arm || LEFT_ARM_SKIN, worldTransforms, ps('left_arm'));
    case 'right_leg':
      return computeSkinBounds(skins.right_leg || RIGHT_LEG_SKIN, worldTransforms, ps('right_leg'));
    case 'left_leg':
      return computeSkinBounds(skins.left_leg || LEFT_LEG_SKIN, worldTransforms, ps('left_leg'));
    case 'weapon': {
      // No skin template — use a generous fixed box around the hand bone.
      const bone = worldTransforms.right_hand;
      if (!bone) return null;
      const sc = ps('weapon');
      return { x: bone.x - 55 * sc, y: bone.y - 55 * sc, w: 110 * sc, h: 180 * sc };
    }
    default: return null;
  }
}

/**
 * Renders each limb / weapon group at the current pose into its own
 * transparent mini-canvas, then stitches them into a single SVG with labels.
 */
export async function exportPartsSheetSVG(character, animationName, currentTime = 0) {
  if (!character) return;

  const resolved = resolveAnimWithOffsets(character, animationName);
  if (!resolved) return;
  const { anim, persistentOffsets } = resolved;

  const t = currentTime % anim.duration;
  const worldTransforms = computeWorldTransforms(mergeOffsets(getPoseAtTime(anim, t), persistentOffsets));

  const { skins, parts, bodyImage, headImage, weaponImage } = await loadRenderAssets(character, animationName);
  const imgOpts = { skins, bodyImage, headImage, weaponImage, animation: animationName };

  // Build label for weapon from part definition
  const groups = SHEET_GROUPS
    .filter(g => g.id !== 'weapon' || parts.weapon !== 'none')
    .map(g => ({
      ...g,
      label: g.label ?? CHARACTER_PARTS.weapon?.options[parts.weapon]?.label ?? 'Weapon',
    }));

  // Render each group into its own canvas
  const rendered = [];
  for (const group of groups) {
    const bounds = groupBounds(group.id, parts, worldTransforms, skins);
    if (!bounds || bounds.w <= 0 || bounds.h <= 0) continue;

    const M  = SHEET_MARGIN;
    const cw = Math.ceil((bounds.w + 2 * M) * SHEET_SCALE);
    const ch = Math.ceil((bounds.h + 2 * M) * SHEET_SCALE);

    const canvas = document.createElement('canvas');
    canvas.width  = cw * SHEET_PR;
    canvas.height = ch * SHEET_PR;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(SHEET_PR, SHEET_PR);

    // Shift so that bounds.x-M maps to canvas x=0
    const tx = -(bounds.x - M) * SHEET_SCALE;
    const ty = -(bounds.y - M) * SHEET_SCALE;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(SHEET_SCALE, SHEET_SCALE);
    renderPartGroup(ctx, group.id, parts, worldTransforms, imgOpts);
    ctx.restore();

    rendered.push({ label: group.label, w: cw, h: ch, png: canvas.toDataURL('image/png') });
  }

  if (rendered.length === 0) return;

  // Assemble SVG — parts bottom-aligned, labels centred below
  const pad  = SHEET_GAP;
  const maxH = Math.max(...rendered.map(r => r.h));
  const totalW = rendered.reduce((s, r) => s + r.w, 0) + (rendered.length + 1) * pad;
  const totalH = maxH + SHEET_LABEL + 2 * pad;

  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    ` width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">`,
  ];

  let cx = pad;
  for (const r of rendered) {
    const iy = pad + (maxH - r.h); // bottom-align
    const mx = cx + r.w / 2;
    lines.push(
      `<image x="${cx}" y="${iy}" width="${r.w}" height="${r.h}" xlink:href="${r.png}"/>`,
      `<text x="${mx}" y="${iy + r.h + SHEET_LABEL - 3}" text-anchor="middle"`,
      ` font-family="system-ui,ui-sans-serif,sans-serif" font-size="13" fill="#999">${r.label}</text>`,
    );
    cx += r.w + pad;
  }
  lines.push(`</svg>`);

  const blob = new Blob([lines.join('\n')], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  download(url, `${animationName.replace(/[^a-z0-9_-]/gi, '_')}_parts.svg`);
  URL.revokeObjectURL(url);
}

function download(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
}
