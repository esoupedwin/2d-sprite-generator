import { bgLevel, greyHex } from '../utils/canvasBg.js';

/**
 * Vertical black → white slider for the editing-canvas background, pinned to
 * the canvas's right edge. White at the top, black at the bottom. Any move
 * writes a pure grey, replacing whatever colour was stored before.
 */
export function BackgroundSlider({ value, onChange }) {
  const level = bgLevel(value);
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card/80 px-1.5 py-2"
      title={`Canvas background ${greyHex(level)}`}
    >
      <span className="h-3 w-3 rounded-full border border-white/30 bg-white" aria-hidden />
      <input
        type="range"
        min={0}
        max={255}
        step={1}
        value={level}
        onChange={(e) => onChange(greyHex(+e.target.value))}
        aria-label="Canvas background brightness"
        className="h-36 w-4 cursor-pointer accent-primary"
        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
      />
      <span className="h-3 w-3 rounded-full border border-white/30 bg-black" aria-hidden />
    </div>
  );
}
