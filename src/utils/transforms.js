/**
 * Merges animation pose deltas with character bone offset customisations.
 * boneOffsets are added on top of the animation pose for each axis.
 * The animation rotation is kept as-is (offsets don't add to rotation).
 */
export function mergeOffsets(pose, boneOffsets) {
  const result = {};
  const ids = new Set([...Object.keys(pose), ...Object.keys(boneOffsets)]);
  for (const id of ids) {
    const p = pose[id] || {}, o = boneOffsets[id] || {};
    result[id] = { x: (o.x || 0) + (p.x || 0), y: (o.y || 0) + (p.y || 0), rotation: p.rotation || 0 };
  }
  return result;
}
