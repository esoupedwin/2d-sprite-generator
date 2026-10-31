// Editing-canvas background: a single grey level picked on the black → white
// slider at the canvas's right edge (BackgroundSlider.jsx). Stored as a hex
// string in `settings.canvasBg`, so older saved colours (e.g. the warm yellow)
// still render until the slider is moved.

export const DEFAULT_CANVAS_BG = '#E5E5E5';

/** Grey hex for a level 0 (black) … 255 (white). */
export function greyHex(level) {
  const v = Math.max(0, Math.min(255, Math.round(level))).toString(16).padStart(2, '0');
  return `#${v}${v}${v}`.toUpperCase();
}

/** Perceived brightness 0…255 of a #RRGGBB colour (Rec. 601 weights). */
export function bgLevel(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? '');
  if (!m) return bgLevel(DEFAULT_CANVAS_BG);
  const [r, g, b] = m.slice(1).map(h => parseInt(h, 16));
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

// How far (in 0…255 brightness steps) each overlay element sits from the
// background. Contrast is set by this difference, not by a fixed alpha: a
// fixed alpha washes out at mid-grey, where neither black nor white ink has
// much room to differ from the background.
export const INK_CONTRAST = {
  gridMinor: 18,
  gridMajor: 32,
  axis:      60,
  label:     110,
  readout:   100,
  box:       200,
  boxLabel:  150,
};

/**
 * Overlay ink for this background. Returns `(contrast) => 'rgba(…)'`: black on
 * light backgrounds, white on dark ones, with the alpha that lands the drawn
 * colour `contrast` brightness steps away from the background (capped at
 * fully opaque). Used for the grid, coordinate labels, alignment box and the
 * animation readout so they stay equally visible anywhere on the slider.
 */
export function canvasInk(hex) {
  const level = bgLevel(hex);
  const dark  = level < 128;
  const rgb   = dark ? '255,255,255' : '0,0,0';
  const room  = Math.max(1, dark ? 255 - level : level); // max brightness shift available
  return (contrast) => `rgba(${rgb},${Math.min(1, contrast / room).toFixed(3)})`;
}
