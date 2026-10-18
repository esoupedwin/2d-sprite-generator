import { useEffect, useState } from 'react';
import { Folder, FolderOutput, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';
import { MIN_FRAMES, MAX_FRAMES, DEFAULT_FRAMES } from '../utils/spriteExportConfig.js';
import { listExportableActions, batchExportRelativeDir, fetchDefaultExportDir } from '../utils/export.js';

// Sentinel for characters that aren't in any folder.
export const ROOT_FOLDER = '\u0000root';

/**
 * "Export Folder" — every character in one manager folder, each written as
 * body + legs sheets per action (same layout as the single-character export):
 *   <output folder>/<folder>/<character>/{body,legs}/<action>.png
 */
export function FolderExportDialog({ open, onClose, characters, folders, defaultFolder, onExport }) {
  const [folder, setFolder]         = useState(null);
  const [frameCount, setFrameCount] = useState(DEFAULT_FRAMES);
  const [outDir, setOutDir]         = useState('');
  const [busy, setBusy]             = useState(false);
  const [progress, setProgress]     = useState(null);
  const [result, setResult]         = useState(null);

  const rootChars = characters.filter(c => !c.folder || !folders.includes(c.folder));
  const options = [
    ...folders.map(name => ({ key: name, label: name, chars: characters.filter(c => c.folder === name) })),
    ...(rootChars.length ? [{ key: ROOT_FOLDER, label: 'No folder', chars: rootChars }] : []),
  ];
  const selected = options.find(o => o.key === folder) ?? null;
  const sheetCount = selected ? selected.chars.reduce((n, c) => n + listExportableActions(c).length * 2, 0) : 0;

  useEffect(() => {
    if (!open) return;
    setResult(null); setProgress(null);
    // Default to the active character's folder, else the first option.
    const preferred = defaultFolder && folders.includes(defaultFolder) ? defaultFolder
                    : (defaultFolder == null && rootChars.length ? ROOT_FOLDER : null);
    setFolder(preferred ?? options[0]?.key ?? null);
    if (!outDir) {
      let alive = true;
      fetchDefaultExportDir().then(dir => { if (alive && dir) setOutDir(prev => prev || dir); });
      return () => { alive = false; };
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const fc = Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, Math.round(frameCount) || DEFAULT_FRAMES));
  const canExport = !busy && selected && selected.chars.length > 0 && outDir.trim().length > 0;

  const run = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await onExport({
        characters: selected.chars,
        frameCount: fc,
        root: outDir.trim(),
        onProgress: (p) => setProgress(p),
      });
      setResult({ ok: true, ...res });
    } catch (err) {
      setResult({ ok: false, error: err?.message ?? String(err) });
    } finally {
      setBusy(false); setProgress(null);
    }
  };

  const stepBtn = 'w-7 h-7 rounded border border-border bg-secondary text-foreground text-sm leading-none flex items-center justify-center hover:border-primary disabled:opacity-35 disabled:cursor-default transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-export-title"
        className="relative w-[460px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex flex-col gap-px">
            <h2 id="folder-export-title" className="text-sm font-semibold text-foreground">Export Folder</h2>
            <span className="text-[11px] text-muted-foreground">Every character in the folder · body + legs sheets per action</span>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-4">
          {/* Folder picker */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-foreground">Folder</span>
            {options.length === 0 ? (
              <span className="text-[11px] text-muted-foreground">No characters to export.</span>
            ) : (
              <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1">
                {options.map(o => (
                  <button
                    key={o.key}
                    type="button"
                    disabled={busy}
                    onClick={() => setFolder(o.key)}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded border text-left transition-colors',
                      folder === o.key ? 'border-primary bg-primary/15' : 'border-border/60 bg-secondary/40 hover:border-border',
                    )}
                  >
                    <Folder className={cn('h-3.5 w-3.5 shrink-0', o.key === ROOT_FOLDER ? 'text-muted-foreground' : 'text-amber-400/80')} />
                    <span className="flex-1 text-sm text-foreground truncate">{o.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                      {o.chars.length} character{o.chars.length === 1 ? '' : 's'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Frames */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-foreground">Frames per action</span>
              <span className="text-[10px] text-muted-foreground">{MIN_FRAMES}–{MAX_FRAMES} · each sheet wraps at 6 columns</span>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className={stepBtn} disabled={fc <= MIN_FRAMES || busy} onClick={() => setFrameCount(fc - 1)}>−</button>
              <input
                type="number"
                min={MIN_FRAMES} max={MAX_FRAMES}
                value={frameCount}
                disabled={busy}
                onChange={e => setFrameCount(e.target.value === '' ? '' : Number(e.target.value))}
                onBlur={() => setFrameCount(fc)}
                className="w-14 h-7 text-center text-sm font-mono rounded border border-border bg-secondary text-foreground outline-none focus:border-primary"
              />
              <button type="button" className={stepBtn} disabled={fc >= MAX_FRAMES || busy} onClick={() => setFrameCount(fc + 1)}>+</button>
            </div>
          </div>

          {/* Output folder */}
          <label className="flex flex-col gap-1">
            <span className="text-xs text-foreground">Save to folder</span>
            <input
              type="text"
              value={outDir}
              disabled={busy}
              onChange={e => setOutDir(e.target.value)}
              placeholder="e.g. D:\\Development\\COIN\\public\\sprites"
              spellCheck={false}
              className="h-8 px-2.5 rounded-md border border-border bg-secondary text-sm font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
            />
            {selected && selected.chars.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-mono break-all">
                → {outDir.trim() ? outDir.trim().replace(/[\\/]+$/, '') : '<folder>'}{'/'}{batchExportRelativeDir(selected.chars[0])}{'/'}{'{body,legs}'}{'/'}{'<action>.png'}
                {selected.chars.length > 1 && <span className="text-muted-foreground/60"> … ×{selected.chars.length}</span>}
              </span>
            )}
          </label>

          {/* Characters in the folder */}
          {selected && (
            <div className="flex flex-wrap gap-1">
              {selected.chars.map(c => (
                <span key={c.id} className="px-2 py-0.5 rounded-full border border-border bg-secondary text-[11px] text-muted-foreground">
                  {c.displayName || c.name}
                  <span className="font-mono text-muted-foreground/60"> · {listExportableActions(c).length}</span>
                </span>
              ))}
            </div>
          )}

          {progress && (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 rounded bg-secondary overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono break-all">{progress.done}/{progress.total} · {progress.label}</span>
            </div>
          )}

          {result && (
            result.ok ? (
              <div className="text-[11px] text-emerald-500 leading-relaxed">
                Wrote {result.written} file{result.written === 1 ? '' : 's'} for {result.characters} character{result.characters === 1 ? '' : 's'} under <span className="font-mono text-foreground break-all">{result.root}</span>
              </div>
            ) : (
              <div className="text-[11px] text-destructive leading-relaxed">
                Export failed: {result.error}
                <span className="block text-muted-foreground mt-0.5">The folder export writes through the dev server (<span className="font-mono">npm run dev</span>); the path must be an absolute folder on this machine.</span>
              </div>
            )
          )}
        </div>

        <div className="flex justify-between gap-2 px-4 py-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
            {result?.ok ? 'Done' : 'Cancel'}
          </Button>
          <Button type="button" size="sm" onClick={run} disabled={!canExport}>
            <FolderOutput className="h-3.5 w-3.5 mr-1.5" />
            {busy ? 'Exporting…' : `Export ${sheetCount} sheets`}
          </Button>
        </div>
      </div>
    </div>
  );
}
