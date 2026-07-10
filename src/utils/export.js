import { ANIMATIONS, getPoseAtTime, resolveAnimation } from '../systems/AnimationSystem.js';
import { BONES, computeWorldTransforms } from '../systems/SkeletonSystem.js';
import {
  computeSkinBounds,
  HEAD_SKIN, BODY_SKIN,
  LEFT_ARM_SKIN, RIGHT_ARM_SKIN,
  LEFT_LEG_SKIN, RIGHT_LEG_SKIN,
} from '../systems/SkinSystem.js';
import { DEFAULT_SKINS, getSkin } from '../systems/VectorEditor.js';
import { renderCharacter, renderPartGroup, MELEE_WEAPONS } from '../systems/Renderer.js';
import { CHARACTER_PARTS } from '../data/characterParts.js';
import { mergeOffsets } from './transforms.js';
import {
  FRAME_W, FRAME_H, FRAME_ORIGIN_X, FRAME_ORIGIN_Y, FRAME_SCALE,
  FRAME_PX, SHEET_COLS, DEFAULT_FRAMES,
} from './spriteExportConfig.js';

// Oversample factor — the backing canvas is this many times larger than the
// nominal sprite size. Drawing math stays in nominal units (we apply
// ctx.scale once), so curves rasterize at higher pixel density and edges
// come out crisp instead of stair-stepped. Derived from FRAME_PX so the
// exported cell is exactly FRAME_PX × FRAME_PX pixels.
const EXPORT_PIXEL_RATIO = FRAME_PX / FRAME_W;

// Per-animation head PNG override falls back to the character-wide head
// PNG. Mirrors the live-canvas resolution in CharacterCanvas.jsx.
// Resolve the human-readable label for an animation: per-character override
// (animationLabels) → custom animation name → built-in name → raw id.
// Used for export file names so that renamed chips produce matching files.
function resolveAnimLabel(character, animationName) {
  return character?.animationLabels?.[animationName]
      ?? character?.customAnimations?.find(a => a.id === animationName)?.name
      ?? ANIMATIONS[animationName]?.name
      ?? animationName;
}

function sanitizeFileName(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/gi, '_') || 'animation';
}

// Filename base: `<weapon>_<action>` (or just `<action>` when no weapon).
// For custom weapons (cw_…) we use the user-given label (e.g. "Sniper")
// instead of the underlying template (e.g. "rifle") so the filename
// matches what the user sees in the UI. Falls back to the template name
// for unnamed customs.
// If the sanitized action label already starts with the weapon name, the
// weapon prefix is omitted to avoid duplication like `sniper_sniper_walk`.
function exportFileBase(character, animationName) {
  const action = sanitizeFileName(resolveAnimLabel(character, animationName));
  const weaponKey = character?.parts?.weapon ?? 'none';
  const customW   = character?.customWeapons?.find(w => w.key === weaponKey);
  const weaponName = customW?.label ?? customW?.template ?? weaponKey;
  if (!weaponName || weaponName === 'none') return action;
  const w = sanitizeFileName(weaponName);
  if (action === w || action.startsWith(`${w}_`)) return action;
  return `${w}_${action}`;
}

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
  const rawAnim = character.customAnimations?.find(a => a.id === animationName)
    ?? ANIMATIONS[animationName];
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
  const [bodyImage, headImage, weaponImage, accessoryImage, bodyAccessoryImage] = await Promise.all([
    loadImage(parts.bodyImage),
    loadImage(resolveHeadUrl(parts, animationName)),
    loadImage(parts.weaponImages?.[parts.weapon]),
    loadImage(parts.accessoryImages?.[parts.weapon]),
    loadImage(parts.bodyAccessoryImage),
  ]);
  return { skins, parts, bodyImage, headImage, weaponImage, accessoryImage, bodyAccessoryImage };
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
export async function buildSpriteSheet(character, animationName, { frameCount = DEFAULT_FRAMES, drawGrid = false, partsFilter = null } = {}) {
  if (!character) return null;

  // Resolve animation + persistent offsets; preload PNGs and build skin map.
  // Per-keyframe overrides are folded in via resolveAnimation so exported
  // frames match the live preview. Ragdoll overlay is ephemeral and excluded.
  const resolved = resolveAnimWithOffsets(character, animationName);
  if (!resolved) return null;
  const { anim, persistentOffsets } = resolved;
  const { skins, parts, bodyImage, headImage, weaponImage, accessoryImage, bodyAccessoryImage } = await loadRenderAssets(character, animationName);
  const isMelee = MELEE_WEAPONS.has(parts.weapon) ||
    (character.customWeapons ?? []).some(w => w.key === parts.weapon && MELEE_WEAPONS.has(w.template));

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
      accessoryImage,
      bodyAccessoryImage,
      isMelee,
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
 * Builds the sprite sheet (no in-frame grid lines) and triggers a PNG download.
 * With `splitLegs` and/or `splitHead`, exports the character across multiple
 * PNGs at identical frame coords (overlay to reconstruct):
 *   - splitLegs        → <base>_body.png (no legs)  + <base>_legs.png
 *   - splitHead        → <base>_body.png (no head)  + <base>_head.png
 *   - both             → <base>_body.png (no legs/head) + _legs.png + _head.png
 * (`split` is accepted as a legacy alias for `splitLegs`.)
 */
export async function exportSpriteSheet(character, animationName, opts = {}) {
  const { splitLegs = false, splitHead = false, split = false, ...sheetOpts } = opts;
  const legsSplit = splitLegs || split;
  const base = exportFileBase(character, animationName);

  if (!legsSplit && !splitHead) {
    const sheet = await buildSpriteSheet(character, animationName, sheetOpts);
    if (!sheet) return;
    await downloadCanvas(sheet.canvas, `${base}.png`);
    return;
  }

  // Body = everything except the groups being split out.
  const body = await buildSpriteSheet(character, animationName, {
    ...sheetOpts,
    partsFilter: { others: true, legs: !legsSplit, head: !splitHead },
  });
  if (body) await downloadCanvas(body.canvas, `${base}_body.png`);

  if (legsSplit) {
    const legs = await buildSpriteSheet(character, animationName, {
      ...sheetOpts, partsFilter: { others: false, legs: true, head: false },
    });
    if (legs) await downloadCanvas(legs.canvas, `${base}_legs.png`);
  }
  if (splitHead) {
    const head = await buildSpriteSheet(character, animationName, {
      ...sheetOpts, partsFilter: { others: false, legs: false, head: true },
    });
    if (head) await downloadCanvas(head.canvas, `${base}_head.png`);
  }
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

// Generous render area, auto-cropped to the character's content afterwards so
// nothing (ear tips, extended weapons) is clipped for any pose.
const RENDER_W = 720;
const RENDER_H = 720;
const RENDER_ORIGIN_X = RENDER_W / 2;   // centred horizontally
const RENDER_ORIGIN_Y = RENDER_H * 0.74; // feet sit in the lower portion
const POSE_SCALE = 2.0;
const POSE_PIXEL_RATIO = 3;
const CONTENT_MARGIN = 4; // logical px of breathing room around the content

// Bounding box of non-transparent pixels, in device pixels. Null if empty.
function contentBoundsDevice(ctx, w, h) {
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    let row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

// Renders one pose frame into a large transparent canvas, then crops to the
// character's content (+ margin). Returns { canvas, ratio, wLogical, hLogical }.
async function renderPoseBase(character, animationName, currentTime) {
  const resolved = resolveAnimWithOffsets(character, animationName);
  if (!resolved) return null;
  const { anim, persistentOffsets } = resolved;

  const t = currentTime % anim.duration;
  const worldTransforms = computeWorldTransforms(mergeOffsets(getPoseAtTime(anim, t), persistentOffsets));

  const { skins, parts, bodyImage, headImage, weaponImage, accessoryImage, bodyAccessoryImage } = await loadRenderAssets(character, animationName);
  const isMelee = MELEE_WEAPONS.has(parts.weapon) ||
    (character.customWeapons ?? []).some(w => w.key === parts.weapon && MELEE_WEAPONS.has(w.template));

  const big = document.createElement('canvas');
  big.width  = RENDER_W * POSE_PIXEL_RATIO;
  big.height = RENDER_H * POSE_PIXEL_RATIO;
  const ctx = big.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(POSE_PIXEL_RATIO, POSE_PIXEL_RATIO);

  renderCharacter(ctx, parts, worldTransforms, {
    originX: RENDER_ORIGIN_X,
    originY: RENDER_ORIGIN_Y,
    scale:   POSE_SCALE,
    skins,
    animation: animationName,
    bodyImage,
    headImage,
    weaponImage,
    accessoryImage,
    bodyAccessoryImage,
    isMelee,
  });

  const b = contentBoundsDevice(ctx, big.width, big.height);
  if (!b) return { canvas: big, ratio: POSE_PIXEL_RATIO, wLogical: RENDER_W, hLogical: RENDER_H };

  const m  = CONTENT_MARGIN * POSE_PIXEL_RATIO;
  const x0 = Math.max(0, b.minX - m);
  const y0 = Math.max(0, b.minY - m);
  const x1 = Math.min(big.width,  b.maxX + 1 + m);
  const y1 = Math.min(big.height, b.maxY + 1 + m);
  const cw = x1 - x0, ch = y1 - y0;

  const cropped = document.createElement('canvas');
  cropped.width = cw; cropped.height = ch;
  cropped.getContext('2d').drawImage(big, x0, y0, cw, ch, 0, 0, cw, ch);
  return { canvas: cropped, ratio: POSE_PIXEL_RATIO, wLogical: cw / POSE_PIXEL_RATIO, hLogical: ch / POSE_PIXEL_RATIO };
}

// Adds a round, solid outline around the character's non-transparent pixels.
// Works at ~logical resolution (downscaled) so a disk dilation stays cheap and
// bounded no matter how thick the outline; the result is upscaled and the crisp
// character is drawn on top at full resolution. Returns a padded canvas + size.
function applyOutline(base, color = '#ffffff', widthLogical = 6) {
  const { canvas, ratio, wLogical, hLogical } = base;
  const r = Math.round(Math.max(0, widthLogical)); // radius in logical px
  if (r < 1) return base;

  const pad = r + 4; // logical px of transparent margin around the outline
  const ww = Math.ceil(canvas.width  / ratio) + pad * 2;
  const wh = Math.ceil(canvas.height / ratio) + pad * 2;

  // Coloured silhouette of the character, downscaled to logical resolution.
  const work = document.createElement('canvas');
  work.width = ww; work.height = wh;
  const wctx = work.getContext('2d');
  wctx.drawImage(canvas, pad, pad, canvas.width / ratio, canvas.height / ratio);
  wctx.globalCompositeOperation = 'source-in';
  wctx.fillStyle = color;
  wctx.fillRect(0, 0, ww, wh);

  // Disk dilation: stamp the silhouette across a filled disk of offsets. The
  // step scales with r so the stamp count stays bounded (~a few hundred max);
  // gaps are covered because the silhouette features are larger than the step.
  const dil = document.createElement('canvas');
  dil.width = ww; dil.height = wh;
  const dctx = dil.getContext('2d');
  const step = Math.max(1, Math.ceil(r / 11));
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy += step) {
    for (let dx = -r; dx <= r; dx += step) {
      if (dx * dx + dy * dy <= r2) dctx.drawImage(work, dx, dy);
    }
  }

  // Upscale the outline to device resolution; draw the crisp character on top.
  const padDev = pad * ratio;
  const out = document.createElement('canvas');
  out.width  = canvas.width  + padDev * 2;
  out.height = canvas.height + padDev * 2;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(dil, 0, 0, ww, wh, 0, 0, out.width, out.height);
  octx.drawImage(canvas, padDev, padDev);

  return { canvas: out, ratio, wLogical: wLogical + pad * 2, hLogical: hLogical + pad * 2 };
}

// Applies the chosen edits to a rendered base and returns the PNG + dims.
// Synchronous (canvas ops only) so the dialog can re-compose on every edit
// without re-rendering the character.
export function composePose(base, options = {}) {
  if (!base) return null;
  const composed = options.outline?.enabled
    ? applyOutline(base, options.outline.color ?? '#ffffff', options.outline.width ?? 6)
    : base;
  return {
    pngDataUrl: composed.canvas.toDataURL('image/png'),
    width:  composed.wLogical,
    height: composed.hLogical,
  };
}

// Renders the base pose once; held by the dialog so edits re-compose cheaply.
export async function renderPosePreviewBase(character, animationName, currentTime = 0) {
  if (!character) return null;
  return renderPoseBase(character, animationName, currentTime);
}

/**
 * Builds a pose preview PNG (data URL) with optional edits applied (one-shot).
 * options.outline = { enabled, color, width } adds a coloured outline.
 */
export async function buildPosePreview(character, animationName, currentTime = 0, options = {}) {
  const base = await renderPoseBase(character, animationName, currentTime);
  return composePose(base, options);
}

// Wraps a PNG data URL in an SVG that preserves aspect ratio.
export function poseSVGMarkup(pngDataUrl, width, height) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
    ` width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<image width="${width}" height="${height}" xlink:href="${pngDataUrl}"/>`,
    `</svg>`,
  ].join('');
}

export function downloadPoseSVG(character, animationName, svgMarkup) {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
  const url  = URL.createObjectURL(blob);
  download(url, `${exportFileBase(character, animationName)}_pose.svg`);
  URL.revokeObjectURL(url);
}

/**
 * Renders the current pose and downloads it as an SVG (no dialog). `options`
 * is forwarded to buildPosePreview (e.g. { outline: { enabled, color, width } }).
 */
export async function exportPoseSVG(character, animationName, currentTime = 0, options = {}) {
  const preview = await buildPosePreview(character, animationName, currentTime, options);
  if (!preview) return;
  downloadPoseSVG(character, animationName, poseSVGMarkup(preview.pngDataUrl, preview.width, preview.height));
}

/**
 * Exports the resolved animation track data as JSON, including the
 * character's per-keyframe overrides if any.
 */
export function exportAnimationJSON(character, animationName) {
  const rawAnim = character?.customAnimations?.find(a => a.id === animationName)
    ?? ANIMATIONS[animationName];
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
  download(url, `${exportFileBase(character, animationName)}_animation.json`);
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

  const { skins, parts, bodyImage, headImage, weaponImage, accessoryImage } = await loadRenderAssets(character, animationName);
  const imgOpts = { skins, bodyImage, headImage, weaponImage, accessoryImage, animation: animationName };

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
  download(url, `${exportFileBase(character, animationName)}_parts.svg`);
  URL.revokeObjectURL(url);
}

function download(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
}
