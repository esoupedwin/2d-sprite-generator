// Per-bone offsets layer on top of the animation pose. All three axes
// (x, y, rotation) compose additively so a posed character keeps its
// shape and joint angles across animations.
export function mergeOffsets(pose, boneOffsets) {
  const result = {};
  const ids = new Set([...Object.keys(pose), ...Object.keys(boneOffsets)]);
  for (const id of ids) {
    const p = pose[id] || {}, o = boneOffsets[id] || {};
    result[id] = {
      x:        (o.x || 0)        + (p.x || 0),
      y:        (o.y || 0)        + (p.y || 0),
      rotation: (o.rotation || 0) + (p.rotation || 0),
    };
  }
  return result;
}
