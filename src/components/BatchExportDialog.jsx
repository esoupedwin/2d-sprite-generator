import { useMemo } from 'react';
import { listExportableActions, batchExportRelativeDir, SHEETS_PER_ACTION } from '../utils/export.js';
import { characterLabel } from '../utils/characters.js';
import {
  useSheetExport, ExportDialogShell, FrameCountField, OutputFolderField, SheetPathPreview,
  ExportProgress, ExportResult, ExportFooter,
} from './SheetExportParts.jsx';

/**
 * "All Actions → Folder" export. Renders every visible action of the character
 * as a body sheet and a legs sheet and writes them, via the dev server, into
 *   <output folder>/<character folder>/<character>/body/<action>.png
 *   <output folder>/<character folder>/<character>/legs/<action>.png
 * Frame count defaults to 32; the output folder defaults to ~/Downloads.
 */
export function BatchExportDialog({ open, onClose, character, onExport }) {
  const ex = useSheetExport(open, onExport, onClose);
  const actions = useMemo(() => (character ? listExportableActions(character) : []), [character]);

  if (!open) return null;

  return (
    <ExportDialogShell
      titleId="batch-export-title"
      title="Export All Actions"
      subtitle={<>
        <span className="text-foreground font-medium">{characterLabel(character)}</span>
        {' '}· {actions.length} action{actions.length === 1 ? '' : 's'} · body + legs sheets
      </>}
      busy={ex.busy}
      onClose={onClose}
    >
      <div className="px-4 py-3 flex flex-col gap-4">
        <FrameCountField value={ex.frameCount} onChange={ex.setFrameCount} disabled={ex.busy} />

        <OutputFolderField value={ex.outDir} onChange={ex.setOutDir} disabled={ex.busy}>
          <SheetPathPreview outDir={ex.outDir} relDir={batchExportRelativeDir(character)} />
        </OutputFolderField>

        <div className="flex flex-wrap gap-1">
          {actions.map(a => (
            <span key={a.id} className="px-2 py-0.5 rounded-full border border-border bg-secondary text-[11px] text-muted-foreground font-mono">
              {a.file}
            </span>
          ))}
          {actions.length === 0 && <span className="text-[11px] text-muted-foreground">This character has no visible actions.</span>}
        </div>

        <ExportProgress progress={ex.progress} />
        <ExportResult
          result={ex.result}
          renderOk={r => <>Wrote {r.written} file{r.written === 1 ? '' : 's'} to <span className="font-mono text-foreground break-all">{r.root}</span></>}
        />
      </div>

      <ExportFooter
        busy={ex.busy}
        ok={!!ex.result?.ok}
        canExport={ex.ready && actions.length > 0}
        onClose={onClose}
        onRun={ex.run}
        label={`Export ${actions.length * SHEETS_PER_ACTION} sheets`}
      />
    </ExportDialogShell>
  );
}
