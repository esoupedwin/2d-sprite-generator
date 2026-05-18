// FRAME_W / FRAME_H are LOGICAL units (the rendering math operates in these).
// The exported PNG is EXPORT_PIXEL_RATIO× larger per axis, so each frame in
// the saved file is actually FRAME_W * EXPORT_PIXEL_RATIO × FRAME_H * EXPORT_PIXEL_RATIO
// pixels. At default 2× that's 512 × 600 raw pixels per cell.
export const FRAME_W        = 256;
export const FRAME_H        = 300;
export const FRAME_ORIGIN_X = 100;
export const FRAME_ORIGIN_Y = FRAME_H - 30; // foot bone (world y=+16) lands near frame bottom
export const FRAME_SCALE    = 1.0;

// Sheet layout — max columns per row; overflow wraps to the next row.
export const SHEET_COLS = 6;

// Per-export frame-count clamps and default for the export / preview UI.
export const MIN_FRAMES     = 2;
export const MAX_FRAMES     = 48;
export const DEFAULT_FRAMES = 20;
