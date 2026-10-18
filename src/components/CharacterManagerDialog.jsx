import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Folder, FolderPlus, GripVertical, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { RenameInput } from '@/components/ui/rename-input.jsx';
import { useEscapeToClose } from '@/lib/useEscapeToClose.js';
import { cn } from '@/lib/utils.js';
import { folderOf } from '../utils/characters.js';
import { ConfirmDialog } from './ConfirmDialog.jsx';

const ROW_INPUT = 'h-7 text-sm px-2 w-full rounded-md';

/**
 * Character manager with ONE level of folders.
 *
 * Folder membership is `character.folder` (a folder name, or absent = root);
 * `folders` is the ordered list of folder names (may include empty folders).
 * Rows are grouped by folder for display but `characters` keeps its single
 * global order, so reordering is still "move to global index" — a drop on a
 * row also adopts that row's folder, a drop on a folder header moves the
 * character into that folder, and a drop on the "No folder" header ungroups it.
 */
export function CharacterManagerDialog({
  open, onClose,
  characters, activeCharId,
  onSelect, onAdd, onDelete, onRename, onDuplicate, onReorder,
  folders = [], onAddFolder, onRenameFolder, onDeleteFolder, onSetCharacterFolder,
}) {
  const [editingId, setEditingId]         = useState(null); // character being renamed
  const [editingFolder, setEditingFolder] = useState(null); // folder (by name) being renamed
  const [collapsed, setCollapsed]         = useState(() => new Set());
  // Drag state: the character id being dragged and where it would land.
  //   { type:'row', index, before }  — global index + above/below the hovered row
  //   { type:'folder', name }        — onto a folder header
  //   { type:'root' }                — onto the "No folder" header
  const [dragId, setDragId]         = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  // Pending delete awaiting confirmation: { id, name } | null.
  const [deleteTarget, setDeleteTarget] = useState(null);

  // While the delete confirmation is up, Escape belongs to it, not to us.
  useEscapeToClose(open, onClose, !!deleteTarget);

  useEffect(() => {
    if (!open) {
      setEditingId(null); setEditingFolder(null); setDragId(null); setDropTarget(null); setDeleteTarget(null);
    }
  }, [open]);

  if (!open) return null;

  const indexOf = (id) => characters.findIndex(c => c.id === id);
  const groupOf = (c) => folderOf(c, folders);

  const commitName = (id, value) => {
    const trimmed = value.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  };
  const commitFolderName = (name, value) => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) onRenameFolder?.(name, trimmed);
    setEditingFolder(null);
  };
  const addFolder = () => {
    const name = onAddFolder?.();
    if (name) setEditingFolder(name);
  };
  const toggleCollapsed = (name) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  // ── Drag & drop ──
  const endDrag = () => { setDragId(null); setDropTarget(null); };
  const sameTarget = (a, b) => a?.type === b.type && a?.index === b.index && a?.before === b.before && a?.name === b.name;
  /** dragover handler for any drop target: accept the drop and remember where it would land. */
  const over = (e, target) => {
    if (!dragId) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!sameTarget(dropTarget, target)) setDropTarget(target);
  };
  const overRow = (e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    over(e, { type: 'row', index, before: e.clientY < rect.top + rect.height / 2 });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragId && dropTarget) {
      if (dropTarget.type === 'row') {
        onReorder?.(dragId, dropTarget.before ? dropTarget.index : dropTarget.index + 1);
        onSetCharacterFolder?.(dragId, groupOf(characters[dropTarget.index]));
      } else if (dropTarget.type === 'folder') {
        // Park it after the folder's last member so it reads as "appended".
        const members = characters.filter(c => groupOf(c) === dropTarget.name && c.id !== dragId);
        if (members.length) onReorder?.(dragId, indexOf(members[members.length - 1].id) + 1);
        onSetCharacterFolder?.(dragId, dropTarget.name);
      } else {
        onSetCharacterFolder?.(dragId, null);
      }
    }
    endDrag();
  };

  // Keyboard reorder on the grip: Alt+↑ / Alt+↓ (global order).
  const handleGripKey = (e, index) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      onReorder?.(characters[index].id, index - 1);
    } else if (e.key === 'ArrowDown' && index < characters.length - 1) {
      e.preventDefault();
      onReorder?.(characters[index].id, index + 2);
    }
  };

  const handleSelect = (id) => {
    onSelect(id);
    onClose();
  };

  // ── Rows ──
  const renderCharacterRow = (char, { indent }) => {
    const index      = indexOf(char.id);
    const isActive   = char.id === activeCharId;
    const isEditing  = editingId === char.id;
    const canReorder = !!onReorder && characters.length > 1 && !isEditing;
    const lineAbove  = dragId && dropTarget?.type === 'row' && dropTarget.index === index && dropTarget.before;
    const lineBelow  = dragId && dropTarget?.type === 'row' && dropTarget.index === index && !dropTarget.before;
    return (
      <div
        key={char.id}
        draggable={canReorder}
        onDragStart={e => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', char.id);
          setDragId(char.id);
        }}
        onDragOver={e => overRow(e, index)}
        onDrop={handleDrop}
        onDragEnd={endDrag}
        onClick={() => !isEditing && handleSelect(char.id)}
        className={cn(
          'group relative flex shrink-0 items-center gap-1 pl-1 pr-2.5 py-2 rounded border cursor-pointer min-h-[36px] bg-secondary transition-colors',
          indent && 'ml-5',
          isActive ? 'border-primary bg-primary/15' : 'border-transparent hover:border-border',
          dragId === char.id && 'opacity-40',
        )}
      >
        {lineAbove && <div className="pointer-events-none absolute -top-[3px] left-0 right-0 h-0.5 rounded bg-primary" />}
        {lineBelow && <div className="pointer-events-none absolute -bottom-[3px] left-0 right-0 h-0.5 rounded bg-primary" />}
        {canReorder ? (
          <span
            role="button"
            tabIndex={0}
            title="Drag to reorder or into a folder (Alt+↑/↓ to reorder)"
            aria-label={`Reorder ${char.name}`}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => handleGripKey(e, index)}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/50 group-hover:text-muted-foreground hover:text-foreground rounded p-0.5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ring"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}
        {isEditing ? (
          <RenameInput
            initialValue={char.name}
            onCommit={v => commitName(char.id, v)}
            onCancel={() => setEditingId(null)}
            className={ROW_INPUT}
          />
        ) : (
          <span
            onDoubleClick={e => { e.stopPropagation(); setEditingId(char.id); }}
            title="Double-click to rename"
            className={cn('flex-1 text-sm truncate select-none', isActive && 'font-semibold text-foreground')}
          >
            {char.name}
            {char.displayName && (
              <span className="block text-[10px] font-normal text-muted-foreground truncate">{char.displayName}</span>
            )}
          </span>
        )}
        <div className="flex gap-0.5">
          <button
            onClick={e => { e.stopPropagation(); setEditingId(char.id); }}
            title="Rename"
            className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded p-1 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDuplicate(char.id); }}
            title="Duplicate"
            className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded p-1 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {characters.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setDeleteTarget({ id: char.id, name: char.name }); }}
              title="Delete"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderFolder = (name) => {
    const members    = characters.filter(c => groupOf(c) === name);
    const isOpen     = !collapsed.has(name);
    const isEditing  = editingFolder === name;
    const isDropHere = dragId && dropTarget?.type === 'folder' && dropTarget.name === name;
    return (
      <div key={`folder:${name}`} className="flex flex-col gap-1">
        <div
          onDragOver={e => over(e, { type: 'folder', name })}
          onDrop={handleDrop}
          onClick={() => !isEditing && toggleCollapsed(name)}
          className={cn(
            'group flex items-center gap-1.5 pl-1.5 pr-2 py-1.5 rounded border cursor-pointer select-none transition-colors',
            isDropHere ? 'border-primary bg-primary/15' : 'border-border/60 bg-secondary/40 hover:border-border',
          )}
        >
          {isOpen
            ? <ChevronDown  className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <Folder className="h-3.5 w-3.5 text-amber-400/80 shrink-0" />
          {isEditing ? (
            <RenameInput
              initialValue={name}
              onCommit={v => commitFolderName(name, v)}
              onCancel={() => setEditingFolder(null)}
              className={ROW_INPUT}
            />
          ) : (
            <span
              onDoubleClick={e => { e.stopPropagation(); setEditingFolder(name); }}
              title="Double-click to rename folder"
              className="flex-1 text-sm font-medium text-foreground truncate"
            >
              {name}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">{members.length}</span>
          <div className="flex gap-0.5 ml-1">
            <button
              onClick={e => { e.stopPropagation(); setEditingFolder(name); }}
              title="Rename folder"
              className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded p-1 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDeleteFolder?.(name); }}
              title="Remove folder (its characters move out, nothing is deleted)"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {isOpen && members.map(c => renderCharacterRow(c, { indent: true }))}
        {isOpen && members.length === 0 && (
          <div
            onDragOver={e => over(e, { type: 'folder', name })}
            onDrop={handleDrop}
            className={cn(
              'ml-5 px-3 py-2 rounded border border-dashed text-[11px] text-muted-foreground/60',
              isDropHere ? 'border-primary text-primary' : 'border-border/60',
            )}
          >
            Drop characters here
          </div>
        )}
      </div>
    );
  };

  const rootChars  = characters.filter(c => groupOf(c) === null);
  const isDropRoot = dragId && dropTarget?.type === 'root';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-manager-title"
        className="relative w-[460px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="character-manager-title" className="text-sm font-semibold text-foreground">
            Characters
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

        <div
          className="p-4 flex flex-col gap-1 max-h-[60vh] overflow-y-auto"
          onDragOver={e => { if (dragId) e.preventDefault(); }}
          onDrop={handleDrop}
        >
          {folders.map(renderFolder)}

          {folders.length > 0 && (
            <div
              onDragOver={e => over(e, { type: 'root' })}
              onDrop={handleDrop}
              className={cn(
                'mt-1 px-2 py-1 rounded border text-[10px] uppercase tracking-wider select-none transition-colors',
                isDropRoot ? 'border-primary text-primary bg-primary/10' : 'border-transparent text-muted-foreground/60',
              )}
              title="Drop a character here to take it out of its folder"
            >
              No folder
            </div>
          )}
          {rootChars.map(c => renderCharacterRow(c, { indent: false }))}
          {folders.length > 0 && rootChars.length === 0 && (
            <div className="px-3 py-1 text-[11px] text-muted-foreground/50">All characters are in folders.</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {onAddFolder && (
              <Button variant="outline" size="sm" onClick={addFolder} title="Create a folder">
                <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                Folder
              </Button>
            )}
          </div>
          <Button onClick={() => { onAdd(); onClose(); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Character
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete character"
        message={deleteTarget && (
          <>Delete <strong className="text-foreground">{deleteTarget.name}</strong>? Its animations, skins and weapon settings will be removed. This cannot be undone.</>
        )}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
      />
    </div>
  );
}
