// FRAME_W / FRAME_H are LOGICAL units (the rendering math operates in these).
// The exported PNG is EXPORT_PIXEL_RATIO× larger per axis, so each frame in
// the saved file is actually FRAME_PX × FRAME_PX pixels (512 × 512).
export const FRAME_W        = 256;
export const FRAME_H        = 256;
export const FRAME_ORIGIN_X = 128;
export const FRAME_ORIGIN_Y = FRAME_H; // world origin sits at the bottom of the logical frame

// Pixel size of each frame cell in the exported PNG (FRAME_W * 2× oversample).
export const FRAME_PX       = 512;
export const FRAME_SCALE    = 1.0;

// Sheet layout — max columns per row; overflow wraps to the next row.
export const SHEET_COLS = 6;

// Per-export frame-count clamps and default for the export / preview UI.
export const MIN_FRAMES     = 2;
export const MAX_FRAMES     = 48;
export const DEFAULT_FRAMES = 20;
