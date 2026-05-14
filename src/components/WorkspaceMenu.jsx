import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils.js';

const WORKSPACE_FILE_VERSION = 1;

/**
 * "Workspace" dropdown — Save / Load the whole editor state to one JSON file.
 * Image data URLs are embedded so the file is self-contained: loading on
 * another instance restores the exact state without needing the original PNGs.
 */
export function WorkspaceMenu({ characters, activeCharId, uiState, onLoad }) {
  const [open, setOpen] = useState(false);
  const wrapRef     = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleSave = () => {
    const payload = {
      version:    WORKSPACE_FILE_VERSION,
      savedAt:    new Date().toISOString(),
      activeCharId,
      uiState:    uiState ?? {},
      characters: characters ?? [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const a = document.createElement('a');
    a.href = url;
    a.download = `2dsprite-workspace-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    close();
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || !Array.isArray(data.characters)) {
          throw new Error('not a 2D-Sprite workspace file');
        }
        if (data.version !== WORKSPACE_FILE_VERSION) {
          // Forward-compat: try anyway but warn.
          console.warn(`Workspace file version ${data.version} differs from current ${WORKSPACE_FILE_VERSION}; loading best-effort.`);
        }
        onLoad?.({
          characters:   data.characters,
          activeCharId: data.activeCharId ?? data.characters[0]?.id ?? null,
          uiState:      data.uiState ?? {},
        });
        close();
      } catch (err) {
        alert(`Couldn't load workspace: ${err.message}`);
      }
    };
    reader.onerror = () => alert('Failed to read file.');
    reader.readAsText(file);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-semibold transition-colors',
          open
            ? 'border-sky-500/60 text-sky-400'
            : 'text-muted-foreground hover:border-sky-500/60 hover:text-sky-400',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Save or load the entire workspace as a single JSON file"
      >
        Workspace
        <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-70">
          <path d="M2 4 L5 7 L8 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[200px] rounded-md border border-border bg-card shadow-lg z-50 overflow-hidden"
        >
          <button
            role="menuitem"
            type="button"
            onClick={handleSave}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-sky-400 transition-colors"
          >
            <div>Save Workspace…</div>
            <div className="text-[10px] opacity-70 mt-0.5">All characters · animations · images</div>
          </button>
          <div className="border-t border-border" />
          <button
            role="menuitem"
            type="button"
            onClick={handleLoad}
            className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-sky-400 transition-colors"
          >
            <div>Load Workspace…</div>
            <div className="text-[10px] opacity-70 mt-0.5">Replaces all characters</div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}
    </div>
  );
}
