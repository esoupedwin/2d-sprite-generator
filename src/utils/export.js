import { ANIMATIONS, getPoseAtTime, resolveAnimation } from '../systems/AnimationSystem.js';
import { computeWorldTransforms } from '../systems/SkeletonSystem.js';
import { DEFAULT_SKINS, getSkin } from '../systems/VectorEditor.js';
import { renderCharacter } from '../systems/Renderer.js';
import { mergeOffsets } from './transforms.js';

const FRAME_W = 160;
const FRAME_H = 240;
const FRAME_ORIGIN_X = FRAME_W / 2;
const FRAME_ORIGIN_Y = FRAME_H - 30;
const FRAME_SCALE = 1.0;
const SHEET_COLS = 6;

// Oversample factor — the backing canvas is this many times larger than the
// nominal sprite size. Drawing math stays in nominal units (we apply
// ctx.scale once), so curves rasterize at higher pixel density and edges
// come out crisp instead of stair-stepped.
const EXPORT_PIXEL_RATIO = 2;

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

/**
 * Renders every frame of an animation to a sprite sheet PNG and triggers
 * download. The output matches what's drawn live on the canvas:
 *  - animation keyframe curves (with per-keyframe overrides applied)
 *  - character rest-pose `boneOffsets`
 *  - per-animation `animBoneOffsets` for the current animation
 *  - vector `skinOverrides` (skin overlay)
 *  - body/head/weapon PNG reskins
 *  - custom animations on the character
 *  - per-weapon offset/scale and per-(weapon×animation) anchor offsets
 */
export async function exportSpriteSheet(character, animationName, { frameCount = 12 } = {}) {
  if (!character) return;

  // Resolve the animation — built-in first, custom fallback. Then layer the
  // character's per-keyframe overrides on top via resolveAnimation, so the
  // exported frames match the live preview.
  const rawAnim = ANIMATIONS[animationName]
    ?? character.customAnimations?.find(a => a.id === animationName);
  if (!rawAnim) return;
  const animKeyframeOverrides = character.animKeyframeOverrides?.[animationName] ?? null;
  const anim = resolveAnimation(rawAnim, animKeyframeOverrides);

  // Persistent offsets stacked the same way CharacterCanvas does in drawFrame:
  //   character rest-pose boneOffsets + per-animation animBoneOffsets.
  // (Ragdoll overlay is ephemeral and intentionally excluded.)
  const animSpecificOff = (character.animBoneOffsets ?? {})[animationName] ?? {};
  const persistentOffsets = mergeOffsets(character.boneOffsets ?? {}, animSpecificOff);

  // Skins (vector overlay) — fall back to defaults per key.
  const skinOverrides = character.skinOverrides ?? {};
  const skins = {};
  for (const key of Object.keys(DEFAULT_SKINS)) skins[key] = getSkin(key, skinOverrides);

  // Preload PNGs once so each frame can drawImage synchronously.
  const parts = character.parts ?? {};
  const weaponUrl = parts.weaponImages?.[parts.weapon];
  const [bodyImage, headImage, weaponImage] = await Promise.all([
    loadImage(parts.bodyImage),
    loadImage(parts.headImage),
    loadImage(weaponUrl),
  ]);

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
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;

  for (let i = 0; i < frameCount; i++) {
    const t = (i / frameCount) * anim.duration;
    const animPose       = getPoseAtTime(anim, t);
    const fullPose       = mergeOffsets(animPose, persistentOffsets);
    const worldTransforms = computeWorldTransforms(fullPose);

    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = col * FRAME_W;
    const oy = row * FRAME_H;

    ctx.strokeRect(ox, oy, FRAME_W, FRAME_H);

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
    });
    ctx.restore();
  }

  download(canvas.toDataURL('image/png'), `${animationName}_spritesheet.png`);
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

function download(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
}
