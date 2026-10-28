import { useEffect, useState } from 'react';
import { Combine, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';
import { CHARACTER_PARTS } from '../data/characterParts.js';
import { visibleActions } from '../systems/AnimationSystem.js';
import { resolveWeaponTemplate } from '../utils/weaponSettings.js';

/** Weapon type as the user named it: custom label → built-in label → key. */
function weaponLabel(c) {
  const key = c?.parts?.weapon ?? 'none';
  return c?.customWeapons?.find(w => w.key === key)?.label
      ?? CHARACTER_PARTS.weapon.options[key]?.label
      ?? key;
}

/**
 * "Merge and Create": pick a BASE (body, skins, images, weapon settings) and a
 * SECONDARY (animations). Create makes a copy of the base whose animations are
 * replaced by the secondary's — see `mergeCharacters` in App.jsx. Escape /
 * backdrop / ✕ cancel, Enter creates once both are chosen.
 */
export function MergeCharactersDialog({ open, onClose, characters, activeCharId, onCreate }) {
  const [baseId, setBaseId]           = useState(null);
  const [secondaryId, setSecondaryId] = useState(null);

  // On open, the base defaults to the active character; the secondary is the user's pick.
  useEffect(() => {
    if (open) { setBaseId(activeCharId ?? null); setSecondaryId(null); }
  }, [open, activeCharId]);

  const base      = characters.find(c => c.id === baseId)      ?? null;
  const secondary = characters.find(c => c.id === secondaryId) ?? null;
  const ready     = !!base && !!secondary && base.id !== secondary.id;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape')              { e.preventDefault(); onClose(); }
      else if (e.key === 'Enter' && ready) { e.preventDefault(); onCreate(base.id, secondary.id); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, ready, base, secondary, onClose, onCreate]);

  if (!open) return null;

  const weaponChanges = ready && resolveWeaponTemplate(base) !== resolveWeaponTemplate(secondary);
  const actionCount   = secondary ? visibleActions(secondary).length : 0;

  const renderPicker = (label, hint, selectedId, onPick, takenId) => (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex flex-col gap-px">
        <span className="text-xs text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      </div>
      <div className="flex flex-col gap-1 max-h-[260px] overflow-y-auto pr-1">
        {characters.map(c => {
          const isSel   = c.id === selectedId;
          const isTaken = c.id === takenId; // already used by the other picker
          return (
            <div
              key={c.id}
              onClick={() => !isTaken && onPick(c.id)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded border transition-colors',
                isTaken ? 'opacity-35 cursor-not-allowed border-transparent'
                : isSel ? 'border-primary bg-primary/15 cursor-pointer'
                : 'border-transparent hover:bg-secondary cursor-pointer',
              )}
            >
              <span className="flex flex-col gap-px min-w-0 flex-1">
                <span className={cn('text-sm truncate', isSel && 'font-semibold text-foreground')}>{c.name}</span>
                {c.displayName && <span className="text-[10px] text-muted-foreground truncate">{c.displayName}</span>}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">{weaponLabel(c)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-characters-title"
        className="relative w-[640px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex flex-col gap-px">
            <h2 id="merge-characters-title" className="text-sm font-semibold text-foreground">Merge and Create</h2>
            <span className="text-[11px] text-muted-foreground">A copy of the base character with the secondary's animations</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {renderPicker('Base character', 'Body, skins, images and weapon settings', baseId, setBaseId, secondaryId)}
            {renderPicker('Secondary character', 'All of its animations are copied', secondaryId, setSecondaryId, baseId)}
          </div>

          <div className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-3">
            {ready ? (
              <>
                <p>
                  Creates a copy of <span className="text-foreground font-medium">{base.name}</span> with the{' '}
                  {actionCount} action{actionCount === 1 ? '' : 's'} of{' '}
                  <span className="text-foreground font-medium">{secondary.name}</span>. The copy's own animations are replaced.
                </p>
                {weaponChanges && (
                  <p className="mt-1">
                    Weapon type becomes <span className="text-foreground font-medium">{weaponLabel(secondary)}</span> so its
                    actions match — upload a weapon PNG for the new character if it needs one.
                  </p>
                )}
              </>
            ) : (
              <p>Pick a base and a different secondary character.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" disabled={!ready} onClick={() => ready && onCreate(base.id, secondary.id)}>
            <Combine className="h-3.5 w-3.5 mr-1.5" />
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
