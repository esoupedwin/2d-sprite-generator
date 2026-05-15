import { useEffect, useState } from 'react';
import { Copy, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';

export function CharacterManagerDialog({
  open, onClose,
  characters, activeCharId,
  onSelect, onAdd, onDelete, onRename, onDuplicate,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setEditingId(null);
  }, [open]);

  if (!open) return null;

  const startEdit = (char, e) => {
    e.stopPropagation();
    setEditingId(char.id);
    setEditName(char.name);
  };

  const commitEdit = (id) => {
    const trimmed = editName.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  };

  const handleSelect = (id) => {
    onSelect(id);
    onClose();
  };

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

        <div className="p-4 flex flex-col gap-1 max-h-[60vh] overflow-y-auto">
          {characters.map(char => {
            const isActive = char.id === activeCharId;
            const isEditing = editingId === char.id;
            return (
              <div
                key={char.id}
                onClick={() => !isEditing && handleSelect(char.id)}
                className={cn(
                  'group flex items-center gap-1 px-2.5 py-2 rounded border cursor-pointer min-h-[36px] bg-secondary transition-colors',
                  isActive ? 'border-primary bg-primary/15' : 'border-transparent hover:border-border',
                )}
              >
                {isEditing ? (
                  <Input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => commitEdit(char.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  commitEdit(char.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="h-7 text-sm px-2"
                  />
                ) : (
                  <span
                    onDoubleClick={e => startEdit(char, e)}
                    title="Double-click to rename"
                    className={cn(
                      'flex-1 text-sm truncate select-none',
                      isActive && 'font-semibold text-foreground',
                    )}
                  >
                    {char.name}
                  </span>
                )}
                <div className="flex gap-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); startEdit(char, e); }}
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
                      onClick={e => { e.stopPropagation(); onDelete(char.id); }}
                      title="Delete"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={() => { onAdd(); onClose(); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Character
          </Button>
        </div>
      </div>
    </div>
  );
}
