import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { MIN_FRAMES, MAX_FRAMES, DEFAULT_FRAMES, SHEET_COLS, FRAME_PX } from '../utils/spriteExportConfig.js';

/**
 * Lightweight modal that asks the user how many frames the exported sprite
 * sheet should have, then calls `onExport(frameCount)`. The sheet always
 * lays out at most SHEET_COLS frames per row and wraps additional frames
 * onto subsequent rows.
 */
export function SpriteExportDialog({ open, onClose, onExport, animationName }) {
  const [frameCount, setFrameCount] = useState(DEFAULT_FRAMES);
  const [split, setSplit] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFrameCount(DEFAULT_FRAMES);
      setSplit(true);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const fc   = Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, frameCount));
  const cols = Math.min(fc, SHEET_COLS);
  const rows = Math.ceil(fc / cols);

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onExport(fc, { split });
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sprite-export-title"
        className="relative w-[400px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="sprite-export-title" className="text-sm font-semibold text-foreground">
            Export Sprite Sheet {animationName ? `· ${animationName}` : ''}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground w-[60px]">
              Frames
            </label>
            <button
              type="button"
              onClick={() => setFrameCount(c => Math.max(MIN_FRAMES, c - 1))}
              disabled={frameCount <= MIN_FRAMES}
              className="w-[26px] h-[26px] rounded-sm border border-border bg-secondary text-foreground text-sm leading-none flex items-center justify-center hover:border-emerald-500 disabled:opacity-35 disabled:cursor-default transition-colors"
            >−</button>
            <input
              type="number"
              min={MIN_FRAMES}
              max={MAX_FRAMES}
              value={frameCount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isFinite(v)) {
                  setFrameCount(Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, v)));
                }
              }}
              className="w-[64px] h-[26px] rounded-sm border border-border bg-secondary text-foreground text-xs text-center font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setFrameCount(c => Math.min(MAX_FRAMES, c + 1))}
              disabled={frameCount >= MAX_FRAMES}
              className="w-[26px] h-[26px] rounded-sm border border-border bg-secondary text-foreground text-sm leading-none flex items-center justify-center hover:border-emerald-500 disabled:opacity-35 disabled:cursor-default transition-colors"
            >+</button>
          </div>

          <div className="text-[11px] text-muted-foreground/80 leading-relaxed">
            Sheet will be <span className="font-mono text-foreground">{cols} × {rows}</span> frames
            ({fc} total). Each frame is <span className="font-mono text-foreground">{FRAME_PX} × {FRAME_PX}</span> px
            — total <span className="font-mono text-foreground">{cols * FRAME_PX} × {rows * FRAME_PX}</span> px.
          </div>

          {/* Split-export toggle */}
          <div className="flex items-start gap-2 pt-2 border-t border-border/60">
            <button
              type="button"
              role="switch"
              aria-checked={split}
              onClick={() => setSplit(s => !s)}
              className={`mt-0.5 relative inline-flex h-[18px] w-[32px] shrink-0 items-center rounded-full border transition-colors ${
                split ? 'bg-emerald-500/30 border-emerald-500' : 'bg-secondary border-border'
              }`}
            >
              <span className={`inline-block h-[12px] w-[12px] rounded-full bg-foreground transition-transform ${
                split ? 'translate-x-[16px]' : 'translate-x-[2px]'
              }`} />
            </button>
            <div className="flex flex-col gap-0.5">
              <label
                onClick={() => setSplit(s => !s)}
                className="text-xs text-foreground cursor-pointer select-none"
              >
                Split body and legs into separate PNGs
              </label>
              <span className="text-[10px] text-muted-foreground/80 leading-snug">
                {split
                  ? 'Two files: <name>_body.png (no legs) and <name>_legs.png. Same frame coords — overlay to reconstruct.'
                  : 'One file with the full character.'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleExport} disabled={busy}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {busy ? 'Rendering…' : split ? 'Export 2 PNGs' : 'Export PNG'}
          </Button>
        </div>
      </div>
    </div>
  );
}
