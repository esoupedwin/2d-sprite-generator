import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SectionTitle } from '@/components/ui/section-title';
import { RenameInput } from '@/components/ui/rename-input.jsx';
import { cn } from '@/lib/utils';
import { X, Trash2, Pencil } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog.jsx';

function AnimChip({ active, disabled, onClick, onDoubleClick, children }) {
  return (
    <Button
      type="button"
      size="chip"
      variant="chip"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      disabled={disabled}
      className={cn(active && 'bg-primary border-primary text-primary-foreground hover:bg-primary')}
    >
      {children}
    </Button>
  );
}

function OnceTag() {
  return (
    <span className="ml-1.5 text-[9px] uppercase tracking-wider bg-white/20 px-1.5 py-px rounded-md">
      once
    </span>
  );
}

// Tone → hover colours, for both the small per-chip buttons and the header toggles.
const TONE = {
  primary:     { hover: 'hover:text-primary hover:bg-primary/10',         active: 'text-primary bg-primary/10' },
  destructive: { hover: 'hover:text-destructive hover:bg-destructive/10', active: 'text-destructive bg-destructive/10' },
};

/** Icon-only button. `active` (header toggles) swaps the hover tone for a lit state. */
function IconButton({ icon: Icon, tone, active = false, size = 'h-3 w-3', onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'rounded p-1 transition-colors',
        active ? TONE[tone].active : cn('text-muted-foreground', TONE[tone].hover),
      )}
    >
      <Icon className={size} />
    </button>
  );
}

/**
 * ACTIONS panel. `actions` is the character's visible action list
 * (`visibleActions(character)` — one source of truth shared with the export),
 * each `{ id, label, loop, builtIn }`. Built-ins come first, then a separator
 * and the character's own animations.
 */
export const AnimationControls = memo(function AnimationControls({
  currentAnimation, actions, hiddenCount = 0, characterName,
  editAnimPose, poseEditorOpen,
  onAnimationChange,
  onNewAnimation, onDeleteAnimation, onRenameAnimation, onRestoreHidden,
}) {
  const [editingId, setEditingId]     = useState(null);
  const [showDelete, setShowDelete]   = useState(false);
  const [showRename, setShowRename]   = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, label, builtIn }
  // The two edit modes are mutually exclusive so a chip never shows both icons.
  const toggleDelete = () => { setShowDelete(p => !p); setShowRename(false); };
  const toggleRename = () => { setShowRename(p => !p); setShowDelete(false); };

  const builtIns = actions.filter(a => a.builtIn);
  const own      = actions.filter(a => !a.builtIn);

  const renderRow = ({ id, label, loop, builtIn }) => (
    <div key={id} className="flex items-center gap-1">
      {editingId === id ? (
        <RenameInput
          initialValue={label}
          onCommit={(v) => { onRenameAnimation?.(id, v); setEditingId(null); }}
          onCancel={() => setEditingId(null)}
          className="h-7 px-2 text-xs rounded-full w-24"
        />
      ) : (
        <AnimChip
          active={currentAnimation === id}
          disabled={poseEditorOpen}
          onClick={() => onAnimationChange(id)}
          onDoubleClick={() => onRenameAnimation && setEditingId(id)}
        >
          {label}{!loop && <OnceTag />}
        </AnimChip>
      )}
      {showRename && onRenameAnimation && editingId !== id && (
        <IconButton icon={Pencil} tone="primary" onClick={() => setEditingId(id)} title="Rename action" />
      )}
      {showDelete && onDeleteAnimation && editingId !== id && (
        <IconButton
          icon={X}
          tone="destructive"
          onClick={() => setConfirmTarget({ id, label, builtIn })}
          title={builtIn ? 'Remove action for this character' : 'Delete animation'}
        />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <SectionTitle>Actions</SectionTitle>
        <div className="flex items-center gap-0.5">
          {onRenameAnimation && (
            <IconButton icon={Pencil} tone="primary" size="h-3.5 w-3.5" active={showRename}
              onClick={toggleRename} title={showRename ? 'Done renaming' : 'Rename actions'} />
          )}
          {onDeleteAnimation && (
            <IconButton icon={Trash2} tone="destructive" size="h-3.5 w-3.5" active={showDelete}
              onClick={toggleDelete} title={showDelete ? 'Hide delete buttons' : 'Show delete buttons'} />
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 border border-border rounded-md p-2">
        {builtIns.map(renderRow)}

        {own.length > 0 && (
          <>
            <Separator className="my-0.5 w-full" />
            {characterName && (
              <span className="w-full text-[10px] text-muted-foreground/60 px-0.5 -mb-0.5">
                {characterName} only
              </span>
            )}
          </>
        )}
        {own.map(renderRow)}

        <Button
          type="button"
          variant="outline"
          size="chip"
          onClick={onNewAnimation}
          className={cn(
            'border-dashed text-muted-foreground',
            poseEditorOpen && 'border-solid border-primary text-primary',
          )}
        >
          {poseEditorOpen ? 'Editing…' : '+ New'}
        </Button>
      </div>

      {editAnimPose && (
        <span className="text-[10px] text-teal-400/70 font-mono">drag bones to adjust</span>
      )}
      {onRenameAnimation && (
        <span className="text-[10px] text-muted-foreground/60">
          {showRename ? 'click a pencil to rename · Enter saves, Esc cancels' : 'double-click a chip to rename'}
        </span>
      )}
      {hiddenCount > 0 && onRestoreHidden && (
        <button
          type="button"
          onClick={onRestoreHidden}
          className="self-start text-[10px] text-muted-foreground/60 hover:text-foreground underline underline-offset-2 transition-colors"
        >
          {hiddenCount} hidden action{hiddenCount > 1 ? 's' : ''} — restore
        </button>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        title="Delete action"
        message={confirmTarget && (confirmTarget.builtIn
          ? <>Remove <strong className="text-foreground">{confirmTarget.label}</strong> from this character&apos;s actions? You can restore hidden actions later.</>
          : <>Delete the custom animation <strong className="text-foreground">{confirmTarget.label}</strong>? This cannot be undone.</>)}
        confirmLabel="Delete"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          onDeleteAnimation(confirmTarget.id);
          setConfirmTarget(null);
        }}
      />
    </div>
  );
});
