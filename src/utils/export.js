import { ANIMATIONS, getPoseAtTime } from '../systems/AnimationSystem.js';
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

/**
 * Renders all frames of an animation to a sprite sheet PNG and triggers download.
 */
export function exportSpriteSheet(character, animationName, boneOffsets = {}, skinOverrides = {}, frameCount = 12) {
  const anim = ANIMATIONS[animationName];
  if (!anim) return;

  const cols = Math.min(frameCount, SHEET_COLS);
  const rows = Math.ceil(frameCount / cols);

  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W * cols;
  canvas.height = FRAME_H * rows;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;

  const skins = {};
  for (const key of Object.keys(DEFAULT_SKINS)) skins[key] = getSkin(key, skinOverrides);

  for (let i = 0; i < frameCount; i++) {
    const t = (i / frameCount) * anim.duration;
    const animPose       = getPoseAtTime(anim, t);
    const fullPose       = mergeOffsets(animPose, boneOffsets);
    const worldTransforms = computeWorldTransforms(fullPose);

    const col = i % cols;
    const row = Math.floor(i / cols);
    const ox = col * FRAME_W;
    const oy = row * FRAME_H;

    ctx.strokeRect(ox, oy, FRAME_W, FRAME_H);

    ctx.save();
    ctx.translate(ox, oy);
    renderCharacter(ctx, character, worldTransforms, {
      originX: FRAME_ORIGIN_X,
      originY: FRAME_ORIGIN_Y,
      scale:   FRAME_SCALE,
      skins,
      animation: animationName,
    });
    ctx.restore();
  }

  download(canvas.toDataURL('image/png'), `${animationName}_spritesheet.png`);
}

/**
 * Exports the raw animation keyframe data as JSON.
 */
export function exportAnimationJSON(animationName) {
  const anim = ANIMATIONS[animationName];
  if (!anim) return;

  const payload = {
    name: animationName,
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
