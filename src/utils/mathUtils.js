// Shared low-level 2-D rotation helpers used across SkinSystem, VectorEditor,
// and IKSystem. Keeping them here prevents each module from carrying its own copy.

/** Rotates a vector (dx, dy) by `rotation` radians (clockwise, canvas convention). */
export function rotateOffset(dx, dy, rotation) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { x: cos * dx - sin * dy, y: sin * dx + cos * dy };
}

/**
 * Transforms an absolute world-space point (wx, wy) into the local frame of a
 * bone/joint that has properties { x, y, rotation }. Inverse of rotateOffset
 * applied to the translated point.
 */
export function worldToLocal(wx, wy, frame) {
  const dx  = wx - frame.x, dy = wy - frame.y;
  const cos = Math.cos(frame.rotation), sin = Math.sin(frame.rotation);
  return { x: cos * dx + sin * dy, y: -sin * dx + cos * dy };
}
