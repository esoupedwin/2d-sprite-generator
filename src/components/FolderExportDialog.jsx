import { useEffect, useMemo, useState } from 'react';
import { Folder } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { countActionSheets, batchExportRelativeDir } from '../utils/export.js';
import { characterLabel, folderOf } from '../utils/characters.js';
import {
  useSheetExport, ExportDialogShell, FrameCountField, OutputFolderField, SheetPathPreview,
  ExportProgress, ExportResult, ExportFooter,
} from './SheetExportParts.jsx';

// Sentinel option key for characters that aren't in any folder.
const ROOT_FOLDER = '\u0000root';

/**
 * "Export Folder" — every character in one manager folder, each written as
 * body + legs sheets per action (same layout as the single-character export):
 *   <output folder>/<folder>/<character>/{body,legs}/<action>.png
 */
export function FolderExportDialog({ open, onClose, characters, folders, defaultFolder, onExport }) {
  const [folder, setFolder] = useState(null);

  // One option per folder (+ "No folder" for the un-foldered), with sheet
  // counts precomputed so renders don't re-derive every character's actions.
  const options = useMemo(() => {
    const byFolder = new Map(folders.map(name => [name, []]));
    const root = [];
    for (const c of characters) {
      const f = folderOf(c, folders);
      (f ? byFolder.get(f) : root).push(c);
    }
    const toOption = (key, label, chars) => ({
      key, label, chars,
      sheets: chars.reduce((n, c) => n + countActionSheets(c), 0),
    });
    return [
      ...folders.map(name => toOption(name, name, byFolder.get(name))),
      ...(root.length ? [toOption(ROOT_FOLDER, 'No folder', root)] : []),
    ];
  }, [characters, folders]);

  const selected = options.find(o => o.key === folder) ?? null;
  const ex = useSheetExport(open, (opts) => onExport({ ...opts, characters: selected.chars }), onClose);

  // On open, default to the active character's folder, else the first option.
  useEffect(() => {
    if (!open) return;
    const preferred = defaultFolder == null ? ROOT_FOLDER : defaultFolder;
    setFolder(options.some(o => o.key === preferred) ? preferred : (options[0]?.key ?? null));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <ExportDialogShell
      titleId="folder-export-title"
      title="Export Folder"
      subtitle="Every character in the folder · body + legs sheets per action"
      busy={ex.busy}
      onClose={onClose}
    >
      <div className="px-4 py-3 flex flex-col gap-4">
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
                  disabled={ex.busy}
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

        <FrameCountField value={ex.frameCount} onChange={ex.setFrameCount} disabled={ex.busy} />

        <OutputFolderField value={ex.outDir} onChange={ex.setOutDir} disabled={ex.busy}>
          {selected?.chars.length > 0 && (
            <SheetPathPreview outDir={ex.outDir} relDir={batchExportRelativeDir(selected.chars[0])}>
              {selected.chars.length > 1 && <span className="text-muted-foreground/60"> … ×{selected.chars.length}</span>}
            </SheetPathPreview>
          )}
        </OutputFolderField>

        {selected && (
          <div className="flex flex-wrap gap-1">
            {selected.chars.map(c => (
              <span key={c.id} className="px-2 py-0.5 rounded-full border border-border bg-secondary text-[11px] text-muted-foreground">
                {characterLabel(c)}
                <span className="font-mono text-muted-foreground/60"> · {countActionSheets(c)}</span>
              </span>
            ))}
          </div>
        )}

        <ExportProgress progress={ex.progress} />
        <ExportResult
          result={ex.result}
          renderOk={r => <>Wrote {r.written} file{r.written === 1 ? '' : 's'} for {r.characters} character{r.characters === 1 ? '' : 's'} under <span className="font-mono text-foreground break-all">{r.root}</span></>}
        />
      </div>

      <ExportFooter
        busy={ex.busy}
        ok={!!ex.result?.ok}
        canExport={ex.ready && !!selected && selected.chars.length > 0}
        onClose={onClose}
        onRun={ex.run}
        label={`Export ${selected?.sheets ?? 0} sheets`}
      />
    </ExportDialogShell>
  );
}
