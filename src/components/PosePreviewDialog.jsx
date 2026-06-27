import { useEffect, useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import { renderPosePreviewBase, composePose, poseSVGMarkup, downloadPoseSVG } from '../utils/export.js';

const OUTLINE_MIN = 1, OUTLINE_MAX = 24, OUTLINE_STEP = 1;

/**
 * Preview + lightweight edit dialog for the "Current Pose (SVG)" export.
 * Renders the pose to a PNG (with the chosen edits applied), shows it on a
 * checkerboard so transparency reads, and exports the wrapped SVG on confirm.
 */
export function PosePreviewDialog({ open, onClose, character, animationName, currentTime = 0 }) {
  const [outline, setOutline] = useState(false);
  const [outlineColor, setOutlineColor] = useState('#ffffff');
  const [outlineWidth, setOutlineWidth] = useState(17);
  const [preview, setPreview] = useState(null); // { pngDataUrl, width, height }
  const [rendering, setRendering] = useState(false);
  const colorRef = useRef(null);
  const baseRef  = useRef(null); // cached rendered base { canvas, ratio, wLogical, hLogical }

  // Reset edits each time the dialog opens.
  useEffect(() => {
    if (open) { setOutline(false); setOutlineColor('#ffffff'); setOutlineWidth(17); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const opts = () => ({ outline: { enabled: outline, color: outlineColor, width: outlineWidth } });

  // Render the character base once per (character, animation, time).
  useEffect(() => {
    if (!open || !character) { baseRef.current = null; setPreview(null); return; }
    let stale = false;
    setRendering(true);
    renderPosePreviewBase(character, animationName, currentTime).then((base) => {
      if (stale) return;
      baseRef.current = base;
      setPreview(composePose(base, opts()));
      setRendering(false);
    });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, character, animationName, currentTime]);

  // Re-compose (cheap) when an edit changes, reusing the cached base.
  useEffect(() => {
    if (!open || !baseRef.current) return;
    setPreview(composePose(baseRef.current, opts()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline, outlineColor, outlineWidth]);

  if (!open) return null;

  const handleExport = () => {
    if (!preview) return;
    downloadPoseSVG(character, animationName, poseSVGMarkup(preview.pngDataUrl, preview.width, preview.height));
    onClose();
  };

  const clampWidth = (v) => Math.max(OUTLINE_MIN, Math.min(OUTLINE_MAX, v));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pose-preview-title"
        className="relative w-[640px] max-w-[94vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="pose-preview-title" className="text-sm font-semibold text-foreground">
            Export Current Pose (SVG){animationName ? ` · ${animationName}` : ''}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 flex gap-4">
          {/* Preview */}
          <div
            className="relative flex-1 min-h-[340px] rounded-md border border-border overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor: '#9aa0a6',
              backgroundImage:
                'linear-gradient(45deg,#7f868c 25%,transparent 25%),linear-gradient(-45deg,#7f868c 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#7f868c 75%),linear-gradient(-45deg,transparent 75%,#7f868c 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0,0 10px,10px -10px,-10px 0',
            }}
          >
            {preview ? (
              <img
                src={preview.pngDataUrl}
                alt="Pose preview"
                className="max-h-[420px] max-w-full object-contain drop-shadow"
              />
            ) : (
              <span className="text-xs text-muted-foreground">Rendering…</span>
            )}
            {rendering && preview && (
              <span className="absolute top-2 right-2 text-[10px] text-white/80 bg-black/40 rounded px-1.5 py-0.5">updating…</span>
            )}
          </div>

          {/* Edit controls */}
          <div className="w-[210px] shrink-0 flex flex-col gap-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Edits</div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} className="accent-primary" />
                <span className="text-xs text-foreground">Outline around character</span>
              </label>

              {outline && (
                <div className="flex flex-col gap-2 pl-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Colour</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => colorRef.current?.click()}
                        className="w-6 h-6 rounded border-2 border-white/20 hover:border-white/50 transition-colors"
                        style={{ background: outlineColor }}
                        title="Pick outline colour"
                      />
                      <input ref={colorRef} type="color" value={outlineColor} onChange={(e) => setOutlineColor(e.target.value)} className="sr-only" />
                      {outlineColor.toLowerCase() !== '#ffffff' && (
                        <button type="button" onClick={() => setOutlineColor('#ffffff')} className="text-[10px] text-muted-foreground hover:text-foreground">white</button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Thickness</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setOutlineWidth(w => clampWidth(w - OUTLINE_STEP))}
                        disabled={outlineWidth <= OUTLINE_MIN}
                        className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary disabled:opacity-35 transition-colors"
                      >−</button>
                      <span className="text-[11px] min-w-[34px] text-center font-mono text-primary">{outlineWidth}px</span>
                      <button
                        onClick={() => setOutlineWidth(w => clampWidth(w + OUTLINE_STEP))}
                        disabled={outlineWidth >= OUTLINE_MAX}
                        className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary disabled:opacity-35 transition-colors"
                      >+</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground/70 leading-relaxed mt-auto">
              The exported SVG has a transparent background; the checkerboard is only shown here so the outline is visible.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport} disabled={!preview} className={cn(!preview && 'opacity-50')}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export SVG
          </Button>
        </div>
      </div>
    </div>
  );
}
