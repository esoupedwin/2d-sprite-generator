import { ANIMATIONS, WEAPON_ANIMATION_SETS } from '../systems/AnimationSystem.js';
import { SectionTitle } from '@/components/ui/section-title';
import { SKIN_COLORS } from '../systems/VectorEditor.js';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Pause, Play, X } from 'lucide-react';

const SKIN_OPTIONS = [
  { key: 'all', label: 'All' },
  ...Object.entries(SKIN_COLORS).map(([key, c]) => ({ key, label: c.label, color: c.anchor })),
];

function AnimChip({ active, disabled, onClick, children }) {
  return (
    <Button
      type="button"
      size="chip"
      variant="chip"
      onClick={onClick}
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

function ModeBtn({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-2.5 py-1 text-xs rounded-md border transition-colors select-none',
        active
          ? 'bg-primary/20 border-primary text-primary font-medium'
          : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground',
        disabled && 'opacity-35 pointer-events-none',
      )}
    >
      {children}
    </button>
  );
}

function ToggleRow({ checked, onChange, label, disabled, title }) {
  const id = `toggle-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className={cn('flex items-center gap-1.5', disabled && 'opacity-35 cursor-not-allowed')} title={title}>
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
      <Label htmlFor={id} className={cn('text-xs text-muted-foreground select-none cursor-pointer', disabled && 'cursor-not-allowed')}>
        {label}
      </Label>
    </div>
  );
}

export function AnimationControls({
  currentAnimation, isPlaying, weapon,
  showBones, showVectors, ragdoll, editStructure, rebindMode, showBinds, selectedSkin,
  customAnimations, poseEditorOpen,
  onAnimationChange, onPlayPause, onToggleBones, onToggleVectors,
  onToggleRagdoll, onToggleEditStructure, onToggleRebindMode, onToggleBinds,
  onSkinChange, onNewAnimation, onDeleteAnimation,
}) {
  const isEdit      = currentAnimation === 'edit';
  const editDisabled = !isEdit || poseEditorOpen;
  const editTitle   = !isEdit ? 'Switch to Edit mode first' : poseEditorOpen ? 'Close pose editor first' : '';

  const allowedKeys = WEAPON_ANIMATION_SETS[weapon ?? 'none'] ?? WEAPON_ANIMATION_SETS.none;

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* ── Zone 1: Animation selection ───────────────────────────────────────── */}
      <SectionTitle>Animation</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(ANIMATIONS).filter(([key]) => allowedKeys.includes(key)).map(([key, anim]) => (
          <AnimChip key={key} active={currentAnimation === key} disabled={poseEditorOpen} onClick={() => onAnimationChange(key)}>
            {anim.name}{!anim.loop && <OnceTag />}
          </AnimChip>
        ))}

        {customAnimations?.length > 0 && <Separator className="my-0.5 w-full" />}

        {customAnimations?.map(anim => (
          <div key={anim.id} className="flex items-center gap-1">
            <AnimChip active={currentAnimation === anim.id} disabled={poseEditorOpen} onClick={() => onAnimationChange(anim.id)}>
              {anim.name}{!anim.loop && <OnceTag />}
            </AnimChip>
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

        {/* New Animation lives at the tail of the chip row */}
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

      <Separator />

      {/* ── Zone 2: Canvas controls ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        {/* Playback + Show Bones */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col items-start gap-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPlayPause}
              disabled={poseEditorOpen}
              className="rounded-full px-4"
            >
              {isPlaying
                ? <><Pause className="h-3 w-3 mr-1.5" />Pause</>
                : <><Play  className="h-3 w-3 mr-1.5" />Play</>
              }
            </Button>
            <span className="text-[10px] font-mono text-muted-foreground/40 pl-1">Space</span>
          </div>

          <ToggleRow checked={!!showBones} onChange={onToggleBones} label="Show Bones" />
        </div>

        {/* Edit mode tools — no header, flows naturally under playback */}
        <div className="flex gap-1.5 flex-wrap" title={editTitle}>
          <ModeBtn active={!!ragdoll}       disabled={editDisabled} onClick={onToggleRagdoll}>Ragdoll</ModeBtn>
          <ModeBtn active={!!editStructure} disabled={editDisabled} onClick={onToggleEditStructure}>Structure</ModeBtn>
          <ModeBtn active={!!showVectors}   disabled={editDisabled} onClick={onToggleVectors}>Vectors</ModeBtn>
        </div>
      </div>

      {/* ── Zone 3: Vector extras (only when Vectors is active) ───────────────── */}
      {showVectors && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-4 flex-wrap">
            <ToggleRow checked={!!rebindMode} onChange={onToggleRebindMode} label="Rebind Anchor"
              title="Drag an anchor to reattach it to the closest valid bone" />
            <ToggleRow checked={!!showBinds} onChange={onToggleBinds} label="Show Binds"
              title="Draw a line from each anchor to the joint it's bound to" />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Skin:</span>
            {SKIN_OPTIONS.map(({ key, label, color }) => {
              const active = selectedSkin === key;
              return (
                <Button
                  key={key}
                  type="button"
                  size="chip"
                  variant="chip"
                  onClick={() => onSkinChange(key)}
                  style={!active && color ? { borderColor: color + '66' } : undefined}
                  className={cn(active && 'bg-primary border-primary text-primary-foreground hover:bg-primary')}
                >
                  {color && <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: color }} />}
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
