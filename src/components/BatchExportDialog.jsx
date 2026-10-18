import { useEffect, useState } from 'react';
import { FolderOutput, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { MIN_FRAMES, MAX_FRAMES, DEFAULT_FRAMES } from '../utils/spriteExportConfig.js';
import { listExportableActions, batchExportRelativeDir, fetchDefaultExportDir } from '../utils/export.js';

/**
 * "All Actions → Folder" export. Renders every visible action of the character
 * as a body sheet and a legs sheet and writes them, via the dev server, into
 *   <output folder>/<character folder>/<character>/body/<action>.png
 *   <output folder>/<character folder>/<character>/legs/<action>.png
 * Frame count defaults to 32; the output folder defaults to ~/Downloads.
 */
export function BatchExportDialog({ open, onClose, character, onExport }) {
  const [frameCount, setFrameCount] = useState(DEFAULT_FRAMES);
  const [outDir, setOutDir]         = useState('');
  const [busy, setBusy]             = useState(false);
  const [progress, setProgress]     = useState(null); // { done, total, label } | null
  const [result, setResult]         = useState(null); // { ok, written, root } | { ok:false, error }

  const actions = character ? listExportableActions(character) : [];
  const relDir  = character ? batchExportRelativeDir(character) : '';

  // Default the output folder to the machine's Downloads folder (from the dev server).
  useEffect(() => {
    if (!open) return;
    setResult(null); setProgress(null);
    if (outDir) return;
    let alive = true;
    fetchDefaultExportDir().then(dir => { if (alive && dir && !outDir) setOutDir(dir); });
    return () => { alive = false; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const fc = Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, Math.round(frameCount) || DEFAULT_FRAMES));
  const canExport = !busy && actions.length > 0 && outDir.trim().length > 0;

  const run = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await onExport({
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
        aria-labelledby="batch-export-title"
        className="relative w-[440px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex flex-col gap-px">
            <h2 id="batch-export-title" className="text-sm font-semibold text-foreground">Export All Actions</h2>
            <span className="text-[11px] text-muted-foreground">
              <span className="text-foreground font-medium">{character?.displayName || character?.name}</span>
              {' '}· {actions.length} action{actions.length === 1 ? '' : 's'} · body + legs sheets
            </span>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-4">
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
            <span className="text-[10px] text-muted-foreground font-mono break-all">
              → {outDir.trim() ? outDir.trim().replace(/[\\/]+$/, '') : '<folder>'}{'/'}{relDir}{'/'}{'{body,legs}'}{'/'}{'<action>.png'}
            </span>
          </label>

          {/* Actions list */}
          <div className="flex flex-wrap gap-1">
            {actions.map(a => (
              <span key={a.id} className="px-2 py-0.5 rounded-full border border-border bg-secondary text-[11px] text-muted-foreground font-mono">
                {a.file}
              </span>
            ))}
            {actions.length === 0 && <span className="text-[11px] text-muted-foreground">This character has no visible actions.</span>}
          </div>

          {progress && (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 rounded bg-secondary overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{progress.done}/{progress.total} · {progress.label}</span>
            </div>
          )}

          {result && (
            result.ok ? (
              <div className="text-[11px] text-emerald-500 leading-relaxed">
                Wrote {result.written} file{result.written === 1 ? '' : 's'} to <span className="font-mono text-foreground break-all">{result.root}</span>
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
            {busy ? 'Exporting…' : `Export ${actions.length * 2} sheets`}
          </Button>
        </div>
      </div>
    </div>
  );
}
