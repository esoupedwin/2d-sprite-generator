import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils.js';

export function ExportMenu({ onSpriteSheet, onSpriteSheetPreview, onAnimationJSON, onPoseSVG, onPartsSheet, open: openProp, onClose }) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open || openProp !== undefined) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpenInternal(false); }
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpenInternal(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, openProp]);

  const pick = (fn) => () => { fn(); onClose?.(); setOpenInternal(false); };

  return (
    <div ref={wrapRef} className={openProp !== undefined ? undefined : 'relative'}>
      {openProp === undefined && (
        <button
          type="button"
          onClick={() => setOpenInternal(o => !o)}
          className={cn(
            'flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold transition-colors',
            open
              ? 'border-emerald-500/60 text-emerald-500'
              : 'text-muted-foreground hover:border-emerald-500/60 hover:text-emerald-500',
          )}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          Export
          <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-70">
            <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[180px] rounded-md border border-border bg-card shadow-lg z-50 overflow-hidden"
        >
          <button
            role="menuitem"
            type="button"
            onClick={pick(onPoseSVG)}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-emerald-500 transition-colors"
          >
            <div>Current Pose (SVG)</div>
            <div className="text-[10px] opacity-60 mt-0.5">Transparent background · current frame</div>
          </button>
          <div className="border-t border-border" />
          <button
            role="menuitem"
            type="button"
            onClick={pick(onPartsSheet)}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-emerald-500 transition-colors"
          >
            <div>Parts Sheet (SVG)</div>
            <div className="text-[10px] opacity-60 mt-0.5">Exploded limbs · current frame</div>
          </button>
          <div className="border-t border-border" />
          <button
            role="menuitem"
            type="button"
            onClick={pick(onSpriteSheet)}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-emerald-500 transition-colors"
          >
            Sprite Sheet (PNG)
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={pick(onSpriteSheetPreview)}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-emerald-500 transition-colors"
          >
            <div>Preview Sprite Sheet…</div>
            <div className="text-[10px] opacity-60 mt-0.5">Play the exported frames in-app</div>
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={pick(onAnimationJSON)}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-emerald-500 transition-colors"
          >
            Animation Data (JSON)
          </button>
        </div>
      )}
    </div>
  );
}
