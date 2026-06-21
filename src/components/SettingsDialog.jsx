import { useEffect, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';

export const DEFAULT_CANVAS_BG     = '#FFE699';
export const DEFAULT_GRID_SPACING  = 50;
export const DEFAULT_GRID_THICKNESS = 1;

export const DEFAULT_SETTINGS = {
  canvasBg:      DEFAULT_CANVAS_BG,
  gridSpacing:   DEFAULT_GRID_SPACING,
  gridThickness: DEFAULT_GRID_THICKNESS,
};

// A few handy backgrounds: default warm, white, neutral grey, chroma green,
// sky blue, near-black.
const PRESETS = ['#FFE699', '#FFFFFF', '#E5E7EB', '#00B140', '#A7D8F0', '#1A1A1A'];

const GRID_SPACING_MIN = 10, GRID_SPACING_MAX = 200, GRID_SPACING_STEP = 5;
const GRID_THICK_MIN   = 0.5, GRID_THICK_MAX  = 4,   GRID_THICK_STEP   = 0.5;

// Compact −/value/+ stepper used by the numeric settings rows.
function Stepper({ value, min, max, step, suffix = '', isDefault, onChange }) {
  const clamp = (v) => Math.max(min, Math.min(max, +v.toFixed(2)));
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="w-[24px] h-[24px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
      >−</button>
      <span className={cn('text-[12px] min-w-[46px] text-center font-mono', isDefault ? 'text-muted-foreground' : 'text-primary')}>
        {value}{suffix}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="w-[24px] h-[24px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
      >+</button>
    </div>
  );
}

/**
 * App settings modal. `settings` holds the persisted values; `onChange(patch)`
 * merges a partial update. Built so more rows can be appended later.
 */
export function SettingsDialog({ open, onClose, settings, onChange }) {
  const colorInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bg        = settings.canvasBg      ?? DEFAULT_CANVAS_BG;
  const spacing   = settings.gridSpacing   ?? DEFAULT_GRID_SPACING;
  const thickness = settings.gridThickness ?? DEFAULT_GRID_THICKNESS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative w-[460px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="settings-title" className="text-sm font-semibold text-foreground">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Canvas background colour */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground">Canvas background</span>
                <span className="text-[11px] text-muted-foreground">Colour behind the character on the editing canvas.</span>
              </div>
              {bg.toUpperCase() !== DEFAULT_CANVAS_BG && (
                <button
                  type="button"
                  onClick={() => onChange({ canvasBg: DEFAULT_CANVAS_BG })}
                  title="Reset to default"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                title="Pick a colour"
                className="w-8 h-8 rounded-md border-2 border-white/20 shrink-0 hover:border-white/50 transition-colors"
                style={{ background: bg }}
              />
              <input
                ref={colorInputRef}
                type="color"
                value={bg}
                onChange={(e) => onChange({ canvasBg: e.target.value })}
                className="sr-only"
              />
              <input
                type="text"
                value={bg.toUpperCase()}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange({ canvasBg: v });
                }}
                className="w-[100px] h-8 rounded-md border border-border bg-secondary px-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
              />
              <div className="flex items-center gap-1 ml-1">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ canvasBg: c })}
                    title={c}
                    className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                      bg.toUpperCase() === c ? 'border-primary ring-1 ring-primary' : 'border-white/20'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border/60" />

          {/* Grid lines */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Grid lines</span>
              {(spacing !== DEFAULT_GRID_SPACING || thickness !== DEFAULT_GRID_THICKNESS) && (
                <button
                  type="button"
                  onClick={() => onChange({ gridSpacing: DEFAULT_GRID_SPACING, gridThickness: DEFAULT_GRID_THICKNESS })}
                  title="Reset to default"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Spacing <span className="opacity-60">(units between lines)</span></span>
              <Stepper
                value={spacing} min={GRID_SPACING_MIN} max={GRID_SPACING_MAX} step={GRID_SPACING_STEP}
                isDefault={spacing === DEFAULT_GRID_SPACING}
                onChange={(v) => onChange({ gridSpacing: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Thickness <span className="opacity-60">(px)</span></span>
              <Stepper
                value={thickness} min={GRID_THICK_MIN} max={GRID_THICK_MAX} step={GRID_THICK_STEP}
                isDefault={thickness === DEFAULT_GRID_THICKNESS}
                onChange={(v) => onChange({ gridThickness: v })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
