import { genId } from './genId.js';

// Absolute frame pose minus character rest pose = animation track delta
function frameDelta(frameOffsets, charOffsets) {
  const result = {};
  const ids = new Set([...Object.keys(frameOffsets), ...Object.keys(charOffsets)]);
  for (const id of ids) {
    const f = frameOffsets[id] ?? {};
    const c = charOffsets[id]  ?? {};
    result[id] = {
      x:        (f.x        ?? 0) - (c.x        ?? 0),
      y:        (f.y        ?? 0) - (c.y        ?? 0),
      rotation: (f.rotation ?? 0) - (c.rotation ?? 0),
    };
  }
  return result;
}

/**
 * Converts pose editor frames into an animation object compatible with
 * getPoseAtTime / mergeOffsets.
 *
 * During playback: mergeOffsets(getPoseAtTime(anim, t), char.boneOffsets)
 * will reconstruct the original captured frame pose exactly.
 *
 * @param {Array}  frames          - [{ id, duration, boneOffsets }]
 * @param {Object} charBoneOffsets - character's current boneOffsets (rest pose)
 * @param {string} name
 * @param {boolean} loop
 */
export function framesToAnimation(frames, charBoneOffsets, name, loop) {
  if (frames.length === 0) return null;

  const tracks = {};
  let t = 0;

  for (const frame of frames) {
    const delta = frameDelta(frame.boneOffsets, charBoneOffsets);
    for (const [boneId, off] of Object.entries(delta)) {
      if (!tracks[boneId]) tracks[boneId] = [];
      tracks[boneId].push({
        time:     t,
        x:        off.x        ?? 0,
        y:        off.y        ?? 0,
        rotation: off.rotation ?? 0,
      });
    }
    t += frame.duration;
  }

  const totalDuration = t;

  // Smooth loop: repeat first frame's values at the end
  if (loop && frames.length > 1) {
    const firstDelta = frameDelta(frames[0].boneOffsets, charBoneOffsets);
    for (const [boneId, off] of Object.entries(firstDelta)) {
      if (!tracks[boneId]) tracks[boneId] = [];
      tracks[boneId].push({
        time:     totalDuration,
        x:        off.x        ?? 0,
        y:        off.y        ?? 0,
        rotation: off.rotation ?? 0,
      });
    }
  }

  return {
    id:       genId(),
    name,
    duration: totalDuration,
    loop,
    tracks,
    custom:   true,
  };
}
