import { useEffect, useState } from 'react';
import { FolderOutput, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useEscapeToClose } from '@/lib/useEscapeToClose.js';
import { MIN_FRAMES, MAX_FRAMES, DEFAULT_FRAMES, clampFrames } from '../utils/spriteExportConfig.js';
import { fetchDefaultExportDir, trimTrailingSlashes } from '../utils/export.js';

/**
 * Pieces shared by the two "write sheets through the dev server" dialogs
 * (BatchExportDialog — one character; FolderExportDialog — a manager folder):
 * the run/progress/result state, the frames stepper, the output-folder field
 * and path preview, the progress bar, the result line and the footer buttons.
 */

/**
 * State for a sheet-export run. `onExport({ frameCount, root, onProgress })`
 * resolves the result object; a dialog with extra inputs wraps it
 * (`(opts) => doExport({ ...opts, characters })`) so `run` stays argument-free
 * and can be passed straight to onClick. On open the previous result is
 * cleared and the output folder, if still empty, defaults to the machine's
 * Downloads folder (functional update, so a path typed while that request is
 * in flight is never clobbered). Escape closes unless a run is in progress.
 */
export function useSheetExport(open, onExport, onClose) {
  const [frameCount, setFrameCount] = useState(DEFAULT_FRAMES);
  const [outDir, setOutDir]         = useState('');
  const [busy, setBusy]             = useState(false);
  const [progress, setProgress]     = useState(null); // { done, total, label } | null
  const [result, setResult]         = useState(null); // { ok:true, ...res } | { ok:false, error }

  useEscapeToClose(open, onClose, busy);

  useEffect(() => {
    if (!open) return;
    setResult(null); setProgress(null);
    let alive = true;
    fetchDefaultExportDir().then(dir => { if (alive && dir) setOutDir(prev => prev || dir); });
    return () => { alive = false; };
  }, [open]);

  const run = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await onExport({ frameCount: clampFrames(frameCount), root: outDir.trim(), onProgress: setProgress });
      setResult({ ok: true, ...res });
    } catch (err) {
      setResult({ ok: false, error: err?.message ?? String(err) });
    } finally {
      setBusy(false); setProgress(null);
    }
  };

  const ready = !busy && outDir.trim().length > 0;
  return { frameCount, setFrameCount, outDir, setOutDir, busy, progress, result, run, ready };
}

/** Overlay + card + header. `subtitle` renders under the title. */
export function ExportDialogShell({ titleId, title, subtitle, busy, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-[460px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex flex-col gap-px">
            <h2 id={titleId} className="text-sm font-semibold text-foreground">{title}</h2>
            <span className="text-[11px] text-muted-foreground">{subtitle}</span>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const STEP_BTN = 'w-7 h-7 rounded border border-border bg-secondary text-foreground text-sm leading-none flex items-center justify-center hover:border-primary disabled:opacity-35 disabled:cursor-default transition-colors';

/** −/number/+ frames stepper. `value` may be '' mid-edit; it's clamped on blur and for the buttons. */
export function FrameCountField({ value, onChange, disabled }) {
  const fc = clampFrames(value);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="text-xs text-foreground">Frames per action</span>
        <span className="text-[10px] text-muted-foreground">{MIN_FRAMES}–{MAX_FRAMES} · each sheet wraps at 6 columns</span>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={STEP_BTN} disabled={fc <= MIN_FRAMES || disabled} onClick={() => onChange(fc - 1)}>−</button>
        <input
          type="number"
          min={MIN_FRAMES} max={MAX_FRAMES}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          onBlur={() => onChange(fc)}
          className="w-14 h-7 text-center text-sm font-mono rounded border border-border bg-secondary text-foreground outline-none focus:border-primary"
        />
        <button type="button" className={STEP_BTN} disabled={fc >= MAX_FRAMES || disabled} onClick={() => onChange(fc + 1)}>+</button>
      </div>
    </div>
  );
}

/** Text field for the output folder; `children` is the "→ path/preview" line. */
export function OutputFolderField({ value, onChange, disabled, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-foreground">Save to folder</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. D:\\Development\\COIN\\public\\sprites"
        spellCheck={false}
        className="h-8 px-2.5 rounded-md border border-border bg-secondary text-sm font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary"
      />
      {children}
    </label>
  );
}

/** "→ <root>/<relDir>/{body,legs}/<action>.png" — `children` appends a note (e.g. "… ×3"). */
export function SheetPathPreview({ outDir, relDir, children }) {
  const root = outDir.trim() ? trimTrailingSlashes(outDir.trim()) : '<folder>';
  return (
    <span className="text-[10px] text-muted-foreground font-mono break-all">
      → {root}/{relDir}/{'{body,legs}'}/{'<action>.png'}{children}
    </span>
  );
}

export function ExportProgress({ progress }) {
  if (!progress) return null;
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="h-1.5 rounded bg-secondary overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono break-all">{progress.done}/{progress.total} · {progress.label}</span>
    </div>
  );
}

/** `renderOk(result)` builds the dialog-specific success line; the failure line is shared. */
export function ExportResult({ result, renderOk }) {
  if (!result) return null;
  if (result.ok) return <div className="text-[11px] text-emerald-500 leading-relaxed">{renderOk(result)}</div>;
  return (
    <div className="text-[11px] text-destructive leading-relaxed">
      Export failed: {result.error}
      <span className="block text-muted-foreground mt-0.5">The folder export writes through the dev server (<span className="font-mono">npm run dev</span>); the path must be an absolute folder on this machine.</span>
    </div>
  );
}

export function ExportFooter({ busy, ok, canExport, onClose, onRun, label }) {
  return (
    <div className="flex justify-between gap-2 px-4 py-3 border-t border-border">
      <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
        {ok ? 'Done' : 'Cancel'}
      </Button>
      <Button type="button" size="sm" onClick={onRun} disabled={!canExport}>
        <FolderOutput className="h-3.5 w-3.5 mr-1.5" />
        {busy ? 'Exporting…' : label}
      </Button>
    </div>
  );
}
