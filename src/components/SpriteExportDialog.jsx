import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { MIN_FRAMES, MAX_FRAMES, DEFAULT_FRAMES, SHEET_COLS, FRAME_PX } from '../utils/spriteExportConfig.js';

// A labelled on/off switch row used for the split-export options.
function SplitToggle({ checked, onToggle, label, desc }) {
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`mt-0.5 relative inline-flex h-[18px] w-[32px] shrink-0 items-center rounded-full border transition-colors ${
          checked ? 'bg-emerald-500/30 border-emerald-500' : 'bg-secondary border-border'
        }`}
      >
        <span className={`inline-block h-[12px] w-[12px] rounded-full bg-foreground transition-transform ${
          checked ? 'translate-x-[16px]' : 'translate-x-[2px]'
        }`} />
      </button>
      <div className="flex flex-col gap-0.5">
        <label onClick={onToggle} className="text-xs text-foreground cursor-pointer select-none">{label}</label>
        <span className="text-[10px] text-muted-foreground/80 leading-snug">{desc}</span>
      </div>
    </div>
  );
}

/**
 * Lightweight modal that asks the user how many frames the exported sprite
 * sheet should have, then calls `onExport(frameCount)`. The sheet always
 * lays out at most SHEET_COLS frames per row and wraps additional frames
 * onto subsequent rows.
 */
export function SpriteExportDialog({ open, onClose, onExport, animationName }) {
  const [frameCount, setFrameCount] = useState(DEFAULT_FRAMES);
  const [split, setSplit] = useState(true);          // split legs
  const [splitHead, setSplitHead] = useState(false); // split head
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setFrameCount(DEFAULT_FRAMES);
      setSplit(true);
      setSplitHead(false);
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

  // Total PNG count: 1 (whole char) unless any split is on, in which case a
  // body PNG plus one per split-out group.
  const pngCount = (split || splitHead) ? 1 + (split ? 1 : 0) + (splitHead ? 1 : 0) : 1;

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onExport(fc, { splitLegs: split, splitHead });
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

          {/* Split-export toggles */}
          <div className="flex flex-col gap-3 pt-2 border-t border-border/60">
            <SplitToggle
              checked={split}
              onToggle={() => setSplit(s => !s)}
              label="Split body and legs into separate PNGs"
              desc={split
                ? 'Adds <name>_legs.png; the body PNG omits the legs. Same frame coords — overlay to reconstruct.'
                : 'Legs stay on the body PNG.'}
            />
            <SplitToggle
              checked={splitHead}
              onToggle={() => setSplitHead(s => !s)}
              label="Split body and head into separate PNGs"
              desc={splitHead
                ? 'Adds <name>_head.png; the body PNG omits the head. Same frame coords — overlay to reconstruct.'
                : 'Head stays on the body PNG.'}
            />
            <span className="text-[10px] text-muted-foreground/70 leading-snug">
              {pngCount === 1
                ? 'Exports one PNG with the full character.'
                : `Exports ${pngCount} PNGs at identical frame coords: ${['<name>_body', split ? '<name>_legs' : null, splitHead ? '<name>_head' : null].filter(Boolean).join(', ')}.png`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleExport} disabled={busy}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {busy ? 'Rendering…' : pngCount > 1 ? `Export ${pngCount} PNGs` : 'Export PNG'}
          </Button>
        </div>
      </div>
    </div>
  );
}
