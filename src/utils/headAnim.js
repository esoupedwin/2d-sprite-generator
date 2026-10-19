// Head-skin frame sequence. The head PNG can be a short animation (e.g. a
// blink): `parts.headImage` is frame 0 — the resting frame, kept as a plain
// string so single-PNG characters are untouched — and `parts.headImageFrames`
// holds the extra frames in play order. Timing lives in `parts.headAnim`.
//
// Time base: a continuous clock. The live canvas feeds its playback clock
// (which does NOT wrap at the action loop — see CharacterCanvas); a play lands
// at the END of each `every` interval (first blink at t = every). Sprite
// sheets can't reproduce that (they sample one pass of the action from t = 0),
// so they use headPlayFrameIndex(): one play from the top of the action, then
// resting. The single-frame exports (pose / parts sheet) keep the clock-based
// headFrameIndex() at the frame's own time.

export const HEAD_ANIM_DEFAULTS = Object.freeze({
  frameMs: 80,   // how long each frame is shown
  every:   2,    // seconds from one play to the next (the play ends the interval); 0 = loop continuously
  bounce:  true, // play forward then back (0 1 2 1) instead of (0 1 2)
});

export const HEAD_FRAME_MS_MIN = 16;
export const HEAD_FRAME_MS_MAX = 2000;
export const HEAD_EVERY_MAX    = 30;

/** All frame data-URLs in play order; [] when the head has no PNG. */
export function headFrameUrls(parts) {
  if (!parts?.headImage) return [];
  return [parts.headImage, ...(parts.headImageFrames ?? [])];
}

export function resolveHeadAnim(parts) {
  return { ...HEAD_ANIM_DEFAULTS, ...(parts?.headAnim ?? {}) };
}

/** Index into headFrameUrls() to show at `timeSec` on the action's timeline. */
export function headFrameIndex(parts, timeSec) {
  const n = 1 + (parts?.headImageFrames?.length ?? 0);
  if (n <= 1 || !parts?.headImage) return 0;
  const { frameMs, every, bounce } = resolveHeadAnim(parts);
  // Integer milliseconds throughout: frame boundaries land exactly on sheet
  // frame times, where float modulo would drift (0.4 % 0.30000000000000004).
  const stepLen  = bounce ? 2 * n - 2 : n;             // frames in one play
  const frame    = Math.max(1, Math.round(frameMs));
  const playMs   = stepLen * frame;
  const periodMs = every > 0 ? Math.max(Math.round(every * 1000), playMs) : playMs;
  const tMs = Number.isFinite(timeSec) ? Math.floor(timeSec * 1000 + 1e-6) : 0;
  const t = ((tMs % periodMs) + periodMs) % periodMs - (periodMs - playMs);
  if (t < 0) return 0;                                 // resting until the interval ends
  const step = Math.min(stepLen - 1, Math.floor(t / frame));
  return step < n ? step : stepLen - step;             // 0 1 2 | 1 (bounce leg)
}

/**
 * Index to show at `timeSec` when the sequence plays ONCE from t = 0 and then
 * rests — `every` is ignored. This is what sprite sheets use: a sheet samples
 * a single pass of the action from t = 0, so a blink that lands at t = `every`
 * (10 s, say) would never appear in it. Exporting one play at the top of the
 * action gives the game a sheet it can trigger whenever a blink is due.
 */
export function headPlayFrameIndex(parts, timeSec) {
  const n = 1 + (parts?.headImageFrames?.length ?? 0);
  if (n <= 1 || !parts?.headImage) return 0;
  const { frameMs, bounce } = resolveHeadAnim(parts);
  const stepLen = bounce ? 2 * n - 2 : n;
  const frame   = Math.max(1, Math.round(frameMs));
  const tMs = Number.isFinite(timeSec) ? Math.floor(timeSec * 1000 + 1e-6) : 0;
  if (tMs < 0 || tMs >= stepLen * frame) return 0;    // before/after the single play → resting
  const step = Math.floor(tMs / frame);
  return step < n ? step : stepLen - step;
}
