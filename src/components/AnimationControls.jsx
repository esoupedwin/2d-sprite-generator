import { memo, useEffect, useRef, useState } from 'react';
import { ANIMATIONS, WEAPON_ANIMATION_SETS } from '../systems/AnimationSystem.js';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

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

/** Inline rename input — replaces the chip label while active. */
function RenameInput({ initialValue, onCommit, onCancel }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={e => {
        if (e.key === 'Enter')      { e.preventDefault(); onCommit(value); }
        else if (e.key === 'Escape'){ e.preventDefault(); onCancel(); }
      }}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      className="h-7 px-2 text-xs rounded-full bg-secondary border border-primary text-foreground outline-none w-24"
    />
  );
}

export const AnimationControls = memo(function AnimationControls({
  currentAnimation, weapon, customWeapons, characterName,
  editAnimPose,
  customAnimations, animationLabels,
  poseEditorOpen,
  onAnimationChange,
  onNewAnimation, onDeleteAnimation, onRenameAnimation,
}) {
  const weaponTemplate = customWeapons?.find(w => w.key === weapon)?.template ?? weapon;
  const allowedKeys = WEAPON_ANIMATION_SETS[weaponTemplate ?? 'none'] ?? WEAPON_ANIMATION_SETS.none;
  const ownAnimations = customAnimations?.filter(a => !ANIMATIONS[a.id]) ?? [];

  const [editingId, setEditingId] = useState(null);

  const labelFor = (id, fallback) => animationLabels?.[id] ?? fallback;

  const renderChip = (id, defaultName, loop) => {
    const label = labelFor(id, defaultName);
    if (editingId === id) {
      return (
        <RenameInput
          initialValue={label}
          onCommit={(v) => { onRenameAnimation?.(id, v); setEditingId(null); }}
          onCancel={() => setEditingId(null)}
        />
      );
    }
    return (
      <AnimChip
        active={currentAnimation === id}
        disabled={poseEditorOpen}
        onClick={() => onAnimationChange(id)}
        onDoubleClick={() => onRenameAnimation && setEditingId(id)}
      >
        {label}{!loop && <OnceTag />}
      </AnimChip>
    );
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <SectionTitle>Actions</SectionTitle>
      <div className="flex flex-wrap gap-1.5 border border-border rounded-md p-2">
        {Object.entries(ANIMATIONS).filter(([key]) => allowedKeys.includes(key)).map(([key, anim]) => (
          <div key={key}>{renderChip(key, anim.name, anim.loop)}</div>
        ))}

        {ownAnimations.length > 0 && (
          <>
            <Separator className="my-0.5 w-full" />
            {characterName && (
              <span className="w-full text-[10px] text-muted-foreground/60 px-0.5 -mb-0.5">
                {characterName} only
              </span>
            )}
          </>
        )}

        {ownAnimations.map(anim => (
          <div key={anim.id} className="flex items-center gap-1">
            {renderChip(anim.id, anim.name, anim.loop)}
            <button
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1 transition-colors"
              onClick={() => onDeleteAnimation(anim.id)}
              title="Delete animation"
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

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
        <span className="text-[10px] text-muted-foreground/60">double-click a chip to rename</span>
      )}
    </div>
  );
});
