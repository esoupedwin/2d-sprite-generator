import { ANIMATIONS, getPoseAtTime, resolveAnimation, animationLabel, visibleActions, defaultAnimationFor } from '../systems/AnimationSystem.js';
import { BONES, computeWorldTransforms } from '../systems/SkeletonSystem.js';
import {
  computeSkinBounds,
  HEAD_SKIN, BODY_SKIN,
  LEFT_ARM_SKIN, RIGHT_ARM_SKIN,
  LEFT_LEG_SKIN, RIGHT_LEG_SKIN,
} from '../systems/SkinSystem.js';
import { DEFAULT_SKINS, getSkin } from '../systems/VectorEditor.js';
import { renderCharacter, renderPartGroup, resolveRenderOptions } from '../systems/Renderer.js';
import { uniqueName } from './names.js';
import { characterLabel } from './characters.js';
import { CHARACTER_PARTS } from '../data/characterParts.js';
import { mergeOffsets } from './transforms.js';
import { headFrameUrls, headFrameIndex, headPlayFrameIndex, pickHeadImage } from './headAnim.js';
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
/** Strips trailing slashes/backslashes from a directory path. */
export function trimTrailingSlashes(dir) {
  return String(dir).replace(/[\\/]+$/, '');
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
  const action = sanitizeFileName(animationLabel(character, animationName));
  const weaponKey = character?.parts?.weapon ?? 'none';
  const customW   = character?.customWeapons?.find(w => w.key === weaponKey);
  const weaponName = customW?.label ?? customW?.template ?? weaponKey;
  if (!weaponName || weaponName === 'none') return action;
  const w = sanitizeFileName(weaponName);
  if (action === w || action.startsWith(`${w}_`)) return action;
  return `${w}_${action}`;
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
// Decodes the character's PNGs once; the result is independent of the animation.
async function loadRenderAssets(character) {
  const skinOverrides = character.skinOverrides ?? {};
  const skins = {};
  for (const key of Object.keys(DEFAULT_SKINS)) skins[key] = getSkin(key, skinOverrides);
  const parts = character.parts ?? {};
  const [bodyImage, headImages, weaponImage, accessoryImage, bodyAccessoryImage, bodyFrontAccessoryImage] = await Promise.all([
    loadImage(parts.bodyImage),
    Promise.all(headFrameUrls(parts).map(loadImage)),
    loadImage(parts.weaponImages?.[parts.weapon]),
    loadImage(parts.accessoryImages?.[parts.weapon]),
    loadImage(parts.bodyAccessoryImage),
    loadImage(parts.bodyFrontAccessoryImage),
  ]);
  // headImages = every head-skin frame in play order (see utils/headAnim.js).
  //   headImageAt(t)     — clock-based (`every` honoured): single-frame exports.
  //   headPlayImageAt(t) — one play from t = 0 then resting: sprite sheets.
  const headImageAt     = (t) => pickHeadImage(headImages, headFrameIndex(parts, t));
  const headPlayImageAt = (t) => pickHeadImage(headImages, headPlayFrameIndex(parts, t));
  return { skins, parts, bodyImage, headImages, headImageAt, headPlayImageAt, weaponImage, accessoryImage, bodyAccessoryImage, bodyFrontAccessoryImage };
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
export async function buildSpriteSheet(character, animationName, { frameCount = DEFAULT_FRAMES, drawGrid = false, partsFilter = null, assets = null, staticHead = false } = {}) {
  if (!character) return null;

  // Resolve animation + persistent offsets; preload PNGs and build skin map.
  // Per-keyframe overrides are folded in via resolveAnimation so exported
  // frames match the live preview. Ragdoll overlay is ephemeral and excluded.
  // `assets` lets a caller rendering several sheets of the same action reuse
  // one loadRenderAssets() result instead of decoding every PNG again.
  // `staticHead` → first head skin on every frame (no head-frame sequence).
  const resolved = resolveAnimWithOffsets(character, animationName);
  if (!resolved) return null;
  const { anim, persistentOffsets } = resolved;
  const { skins, parts, bodyImage, headImages, headPlayImageAt, weaponImage, accessoryImage, bodyAccessoryImage, bodyFrontAccessoryImage } =
    assets ?? await loadRenderAssets(character);
  // `staticHead` pins the head to its first skin (the resting frame) — the still
  // "head" sheet. Otherwise the head-frame sequence plays ONCE from the top of
  // the action (headPlayFrameIndex), so the blink is always in the sheet.
  const headAt = staticHead ? () => pickHeadImage(headImages, 0) : headPlayImageAt;
  const renderOpts = resolveRenderOptions(character, animationName);

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
    // Clip to the cell: a pose that overshoots its frame (crouch below the
    // bottom edge, long weapon past a side) is cut off here rather than
    // bleeding into the neighbouring cell — the frame below, for the bottom edge.
    ctx.beginPath();
    ctx.rect(0, 0, FRAME_W, FRAME_H);
    ctx.clip();
    renderCharacter(ctx, parts, worldTransforms, {
      originX:   FRAME_ORIGIN_X,
      originY:   FRAME_ORIGIN_Y,
      scale:     FRAME_SCALE,
      skins,
      bodyImage,
      headImage: headAt(t),
      weaponImage,
      accessoryImage,
      bodyAccessoryImage,
      bodyFrontAccessoryImage,
      partsFilter,
      ...renderOpts,
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

// The part groups every split export produces, all at identical frame coords
// so a game can overlay them, listed top → bottom as they stack in-game:
//   right_arm — the hand ("Right Arm's Skin") accessory, drawn above everything
//   head      — head prop + the FIRST head skin on every frame (no blink)
//   head_anim — head prop + the head-frame sequence (blink etc.), as previewed
//   body      — torso, arms, weapon, body (back) accessory
//   legs
// `head` and `head_anim` are alternatives for the game to choose between, not
// layers to stack. Shared by the single-sheet download and the folder exports
// so they can't drift apart.
const HEAD_ONLY = { accessory: false, head: true, others: false, legs: false };
export const SPLIT_SHEET_GROUPS = [
  { name: 'right_arm', partsFilter: { accessory: true,  head: false, others: false, legs: false } },
  { name: 'head',      partsFilter: HEAD_ONLY, staticHead: true },
  { name: 'head_anim', partsFilter: HEAD_ONLY },
  { name: 'body',      partsFilter: { accessory: false, head: false, others: true,  legs: false } },
  { name: 'legs',      partsFilter: { accessory: false, head: false, others: false, legs: true  } },
];
export const SHEETS_PER_ACTION = SPLIT_SHEET_GROUPS.length;

/**
 * Browser download of one action: a single PNG of the whole character, or
 * (`split`, the default) one PNG per SPLIT_SHEET_GROUPS — `<base>_right_arm.png`,
 * `<base>_head.png` (still), `<base>_head_anim.png`, `<base>_body.png`, `<base>_legs.png`.
 */
export async function exportSpriteSheet(character, animationName, opts = {}) {
  const { split = true, ...sheetOpts } = opts;
  const base = exportFileBase(character, animationName);

  if (!split) {
    const sheet = await buildSpriteSheet(character, animationName, sheetOpts);
    if (sheet) await downloadCanvas(sheet.canvas, `${base}.png`);
    return;
  }

  // Decode the character's PNGs once for every sheet.
  const assets = await loadRenderAssets(character);
  for (const g of SPLIT_SHEET_GROUPS) {
    const sheet = await buildSpriteSheet(character, animationName, { ...sheetOpts, partsFilter: g.partsFilter, staticHead: !!g.staticHead, assets });
    if (sheet) await downloadCanvas(sheet.canvas, `${base}_${g.name}.png`);
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

  const { skins, parts, bodyImage, headImageAt, weaponImage, accessoryImage, bodyAccessoryImage, bodyFrontAccessoryImage } = await loadRenderAssets(character);

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
    bodyImage,
    headImage: headImageAt(t),
    weaponImage,
    accessoryImage,
    bodyAccessoryImage,
    bodyFrontAccessoryImage,
    ...resolveRenderOptions(character, animationName),
  });

  // originX/originY: where the character's ground point (local 0,0) lands in
  // the returned canvas, in device px — lets callers place every character on
  // the same anchor regardless of how its content got cropped.
  const originDevX = RENDER_ORIGIN_X * POSE_PIXEL_RATIO;
  const originDevY = RENDER_ORIGIN_Y * POSE_PIXEL_RATIO;

  const b = contentBoundsDevice(ctx, big.width, big.height);
  if (!b) return { canvas: big, ratio: POSE_PIXEL_RATIO, wLogical: RENDER_W, hLogical: RENDER_H, originX: originDevX, originY: originDevY };

  const m  = CONTENT_MARGIN * POSE_PIXEL_RATIO;
  const x0 = Math.max(0, b.minX - m);
  const y0 = Math.max(0, b.minY - m);
  const x1 = Math.min(big.width,  b.maxX + 1 + m);
  const y1 = Math.min(big.height, b.maxY + 1 + m);
  const cw = x1 - x0, ch = y1 - y0;

  const cropped = document.createElement('canvas');
  cropped.width = cw; cropped.height = ch;
  cropped.getContext('2d').drawImage(big, x0, y0, cw, ch, 0, 0, cw, ch);
  return {
    canvas: cropped, ratio: POSE_PIXEL_RATIO, wLogical: cw / POSE_PIXEL_RATIO, hLogical: ch / POSE_PIXEL_RATIO,
    originX: originDevX - x0, originY: originDevY - y0,
  };
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

  return {
    canvas: out, ratio, wLogical: wLogical + pad * 2, hLogical: hLogical + pad * 2,
    originX: base.originX + padDev, originY: base.originY + padDev,
  };
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

// ── Character card ──────────────────────────────────────────────────────────
// Trading-card style PNG: white rounded border, dark inner frame, parchment
// background, and the current pose with a white sticker outline centred on it.
const CARD_W = 720;
const CARD_H = 990;
const CARD_BORDER = 28;          // white outer border
const CARD_FRAME = 10;           // dark frame ring inside the border
const CARD_RADIUS = 48;
const CARD_FILL = '#d9cbb4';
const CARD_FRAME_COLOR = '#2f2350';
const CARD_STICKER_PX = 10;      // sticker outline radius (render-logical px)
// Special characters get a sunburst instead of the plain parchment fill.
const CARD_SPECIAL_BASE = '#ffc200';  // amber
const CARD_SPECIAL_RAY = '#ffe699';   // cream rays
const CARD_SPECIAL_RAYS = 12;         // light rays (each as wide as the gap between)
const CARD_SPECIAL_CENTER_Y = 0.46;   // rays converge this far down the inner area
// Every character is drawn at the SAME scale and with its ground point pinned
// to the same spot, so sizes are uniform across cards (a wide helmet or a long
// weapon may clip slightly at the edge instead of shrinking the character).
const CARD_UNIT = 2.9;           // card px per character-local unit
// The pose is anchored on the head joint (local y = -134 in every pose) rather
// than the ground, so the head stays at a fixed spot whatever the size.
const CARD_HEAD_Y = 0.40;        // head joint, as a fraction down the inner area
const CARD_HEAD_LOCAL_Y = 134;   // how far the head joint sits above the ground point

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Alternating amber / cream wedges fanning out from (cx, cy); one cream ray
// points straight up. The caller sets the clip region.
function drawSunburst(ctx, cx, cy, reach, rays, base, light) {
  ctx.fillStyle = base;
  ctx.fillRect(cx - reach, cy - reach, reach * 2, reach * 2);
  ctx.fillStyle = light;
  const half = Math.PI / rays / 2;               // half the width of one light ray
  const R = reach * 1.5;                         // past the corners so chords never show
  for (let i = 0; i < rays; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / rays;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(a - half), cy + R * Math.sin(a - half));
    ctx.lineTo(cx + R * Math.cos(a + half), cy + R * Math.sin(a + half));
    ctx.closePath();
    ctx.fill();
  }
}

export async function buildCharacterCard(character, animationName, currentTime = 0) {
  if (!character) return null;
  const base = await renderPoseBase(character, animationName, currentTime);
  if (!base) return null;
  const sticker = applyOutline(base, '#ffffff', CARD_STICKER_PX);

  const card = document.createElement('canvas');
  card.width = CARD_W; card.height = CARD_H;
  const ctx = card.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Outer white border, then the dark frame ring, then the parchment fill.
  ctx.fillStyle = '#ffffff';
  roundRectPath(ctx, 0, 0, CARD_W, CARD_H, CARD_RADIUS);
  ctx.fill();

  const fx = CARD_BORDER, fy = CARD_BORDER;
  const fw = CARD_W - CARD_BORDER * 2, fh = CARD_H - CARD_BORDER * 2;
  const fr = CARD_RADIUS - CARD_BORDER * 0.5;
  ctx.fillStyle = CARD_FRAME_COLOR;
  roundRectPath(ctx, fx, fy, fw, fh, fr);
  ctx.fill();

  const ix = fx + CARD_FRAME, iy = fy + CARD_FRAME;
  const iw = fw - CARD_FRAME * 2, ih = fh - CARD_FRAME * 2;
  roundRectPath(ctx, ix, iy, iw, ih, Math.max(0, fr - CARD_FRAME));
  if (character.special) {
    ctx.save();
    ctx.clip();
    drawSunburst(ctx, ix + iw / 2, iy + ih * CARD_SPECIAL_CENTER_Y, Math.hypot(iw, ih),
      CARD_SPECIAL_RAYS, CARD_SPECIAL_BASE, CARD_SPECIAL_RAY);
    ctx.restore();
  } else {
    ctx.fillStyle = CARD_FILL;
    ctx.fill();
  }

  // Pose at a fixed scale: the head joint lands at the horizontal centre,
  // CARD_HEAD_Y down the inner area (so the ground point is below it by
  // CARD_HEAD_LOCAL_Y units). Clipped to the inner area so anything that
  // overshoots stops at the frame.
  const k = CARD_UNIT / (POSE_SCALE * sticker.ratio);   // card px per canvas device px
  const groundY = iy + ih * CARD_HEAD_Y + CARD_HEAD_LOCAL_Y * CARD_UNIT;
  const dx = ix + iw / 2 - sticker.originX * k;
  const dy = groundY - sticker.originY * k;
  ctx.save();
  roundRectPath(ctx, ix, iy, iw, ih, Math.max(0, fr - CARD_FRAME));
  ctx.clip();
  ctx.drawImage(sticker.canvas, dx, dy, sticker.canvas.width * k, sticker.canvas.height * k);
  ctx.restore();
  return card;
}

/** Renders the current pose as a framed character card and downloads it as a PNG. */
export async function exportCharacterCardPNG(character, animationName, currentTime = 0) {
  const card = await buildCharacterCard(character, animationName, currentTime);
  if (!card) return;
  await downloadCanvas(card, cardFileName(character));
}

/** `card_buy_<character name>.png` — the file name every card export uses. */
function cardFileName(character) {
  return `card_buy_${sanitizeFileName(characterLabel(character))}.png`;
}

/** `<character folder>/card_buy_<character>.png` (folder level omitted when the character isn't in one). */
export function cardExportRelativePath(character) {
  const file   = cardFileName(character);
  const folder = character?.folder ? sanitizeFileName(character.folder) : null;
  return folder ? `${folder}/${file}` : file;
}

/**
 * Writes one character card PNG per character into `root` through the dev
 * server (/api/export-sprites): `<root>/<folder>/card_buy_<character>.png`. Each
 * card shows the character's default action (idle for most) at t = 0.
 * Same-named characters get numbered files so none overwrites another.
 * onProgress({ done, total, label }) fires before each card is rendered.
 * Resolves { written, characters, root }; throws on the first failure.
 */
export async function exportCharacterCards(characters, { root, onProgress } = {}) {
  const list = (characters ?? []).filter(Boolean);
  if (!list.length) throw new Error('no characters to export');
  if (!root) throw new Error('no output folder');
  const taken = new Set();
  let written = 0, pending = null;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const rel = cardExportRelativePath(c);
    const dot = rel.lastIndexOf('.');
    const unique = uniqueName(rel.slice(0, dot), taken) + rel.slice(dot);
    taken.add(unique.slice(0, unique.lastIndexOf('.')));
    onProgress?.({ done: i, total: list.length, label: unique });
    const card = await buildCharacterCard(c, defaultAnimationFor(c), 0);
    if (pending) { await pending; written++; }
    pending = card ? postSheet(root, unique, card) : null;
  }
  if (pending) { await pending; written++; }
  onProgress?.({ done: list.length, total: list.length, label: 'done' });
  const folder = list[0].folder ? `/${sanitizeFileName(list[0].folder)}` : '';
  return { written, characters: list.length, root: `${trimTrailingSlashes(root)}${folder}` };
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

  const { skins, parts, bodyImage, headImageAt, weaponImage, accessoryImage } = await loadRenderAssets(character);
  const renderOpts = resolveRenderOptions(character, animationName);
  const imgOpts = { skins, bodyImage, headImage: headImageAt(t), weaponImage, accessoryImage, ...renderOpts };

  // Build label for weapon from part definition
  const groups = SHEET_GROUPS
    .filter(g => g.id !== 'weapon' || (parts.weapon !== 'none' && !renderOpts.hideWeapon))
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


// ─── "All Actions → Folder" export ───────────────────────────────────────────
// Writes, through the dev server (/api/export-sprites), one sheet per
// SPLIT_SHEET_GROUPS for every visible action:
//   <root>/<character folder>/<character>/{right_arm,head,head_anim,body,legs}/<action>.png
// All at identical frame coords in-game (head and head_anim are alternatives).

/**
 * The character's visible actions (same list as the ACTIONS panel) with the
 * file name each exports to. Two actions can share a label (e.g. "Carry" added
 * twice from the same template); the later one gets a numbered file so neither
 * is lost.
 */
export function listExportableActions(character) {
  const taken = new Set();
  return visibleActions(character).map(a => {
    const file = uniqueName(sanitizeFileName(a.label), taken);
    taken.add(file);
    return { ...a, file };
  });
}

export function countActionSheets(character) {
  return visibleActions(character).length * SHEETS_PER_ACTION;
}

/** `<character folder>/<character>` (folder level omitted when the character isn't in one). */
export function batchExportRelativeDir(character) {
  const who = sanitizeFileName(characterLabel(character));
  const folder = character?.folder ? sanitizeFileName(character.folder) : null;
  return folder ? `${folder}/${who}` : who;
}

// The Downloads path never changes within a session — one request, shared by
// both export dialogs.
let defaultExportDirPromise = null;
export function fetchDefaultExportDir() {
  return (defaultExportDirPromise ??= fetch('/api/export-sprites')
    .then(r => (r.ok ? r.json() : null))
    .then(j => j?.defaultDir ?? '')
    .catch(() => ''));
}

const canvasToPngBlob = (canvas) => new Promise((resolve, reject) =>
  canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'));

/** Uploads one sheet as raw PNG bytes; root/relPath travel in headers (no base64, no JSON copy). */
async function postSheet(root, relPath, canvas) {
  const blob = await canvasToPngBlob(canvas);
  const r = await fetch('/api/export-sprites', {
    method: 'POST',
    headers: {
      'Content-Type': 'image/png',
      'X-Export-Root': encodeURIComponent(root),
      'X-Export-Path': encodeURIComponent(relPath),
    },
    body: blob,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || !body.ok) throw new Error(body.error ?? `server responded ${r.status}`);
  return body.path;
}

/**
 * Exports every visible action as right-arm + head (still) + head_anim + body + legs sheets into `root`.
 * onProgress({ done, total, label }) is called before each file is written.
 * `relDir` overrides the character's own `<folder>/<name>` directory (used by
 * the multi-character export to keep same-named characters apart).
 * Uploads overlap with the next render: a sheet is posted while the following
 * one is being drawn, and the previous upload is awaited before the next is
 * sent so failures still surface in order.
 * Resolves { written, root } or throws on the first failure.
 */
export async function exportAllActionSheets(character, { frameCount = DEFAULT_FRAMES, root, onProgress, relDir = null } = {}) {
  if (!character) throw new Error('no character');
  if (!root) throw new Error('no output folder');
  const actions = listExportableActions(character);
  const dir     = relDir ?? batchExportRelativeDir(character);
  const total   = actions.length * SHEETS_PER_ACTION;
  // The character's PNGs are the same for every action — decode them once.
  const assets  = await loadRenderAssets(character);
  let done = 0, written = 0, pending = null;
  for (const action of actions) {
    for (const g of SPLIT_SHEET_GROUPS) {
      const relPath = `${dir}/${g.name}/${action.file}.png`;
      onProgress?.({ done, total, label: relPath });
      const sheet = await buildSpriteSheet(character, action.id, { frameCount, partsFilter: g.partsFilter, staticHead: !!g.staticHead, assets });
      if (pending) { await pending; written++; }
      pending = sheet?.canvas ? postSheet(root, relPath, sheet.canvas) : null;
      done++;
    }
  }
  if (pending) { await pending; written++; }
  onProgress?.({ done, total, label: 'done' });
  return { written, root: `${trimTrailingSlashes(root)}/${dir}` };
}

/**
 * Exports several characters (e.g. everyone in one manager folder), each via
 * exportAllActionSheets, with one aggregated progress counter across them all.
 * Resolves { written, characters, root }; throws on the first failure.
 */
export async function exportCharactersSheets(characters, { frameCount = DEFAULT_FRAMES, root, onProgress } = {}) {
  const list = (characters ?? []).filter(Boolean);
  if (!list.length) throw new Error('no characters to export');
  if (!root) throw new Error('no output folder');
  const perChar = list.map(countActionSheets);
  const total   = perChar.reduce((a, b) => a + b, 0);
  // Same display name in the same folder (e.g. a Duplicate) would otherwise
  // write into the same directory and silently overwrite the first export.
  const takenDirs = new Set();
  let before = 0, written = 0;
  for (let i = 0; i < list.length; i++) {
    const relDir = uniqueName(batchExportRelativeDir(list[i]), takenDirs);
    takenDirs.add(relDir);
    const res = await exportAllActionSheets(list[i], {
      frameCount, root, relDir,
      onProgress: (p) => onProgress?.({ done: before + p.done, total, label: p.label }),
    });
    written += res.written;
    before  += perChar[i];
  }
  return { written, characters: list.length, root: trimTrailingSlashes(root) };
}
