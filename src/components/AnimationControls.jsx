import { ANIMATIONS } from '../systems/AnimationSystem.js';
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

function ToggleRow({ checked, onChange, label, disabled, title }) {
  const id = `toggle-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div
      className={cn('flex items-center gap-1.5', disabled && 'opacity-35 cursor-not-allowed')}
      title={title}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
      <Label htmlFor={id} className={cn('text-xs text-muted-foreground select-none cursor-pointer', disabled && 'cursor-not-allowed')}>
        {label}
      </Label>
    </div>
  );
}

export function AnimationControls({
  currentAnimation,
  isPlaying,
  showBones,
  showVectors,
  ragdoll,
  editStructure,
  rebindMode,
  showBinds,
  selectedSkin,
  customAnimations,
  poseEditorOpen,
  onAnimationChange,
  onPlayPause,
  onToggleBones,
  onToggleVectors,
  onToggleRagdoll,
  onToggleEditStructure,
  onToggleRebindMode,
  onToggleBinds,
  onSkinChange,
  onNewAnimation,
  onDeleteAnimation,
}) {
  const isEdit = currentAnimation === 'edit';
  const editDisabled = !isEdit || poseEditorOpen;
  const editTitle   = !isEdit ? 'Switch to Edit mode' : poseEditorOpen ? 'Close pose editor first' : '';

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(ANIMATIONS).map(([key, anim]) => (
          <AnimChip
            key={key}
            active={currentAnimation === key}
            disabled={poseEditorOpen}
            onClick={() => onAnimationChange(key)}
          >
            {anim.name}
            {!anim.loop && <OnceTag />}
          </AnimChip>
        ))}

        {customAnimations?.length > 0 && <Separator className="my-0.5" />}

        {customAnimations?.map(anim => (
          <div key={anim.id} className="flex items-center gap-1">
            <AnimChip
              active={currentAnimation === anim.id}
              disabled={poseEditorOpen}
              onClick={() => onAnimationChange(anim.id)}
            >
              {anim.name}
              {!anim.loop && <OnceTag />}
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
      </div>

      <Button
        type="button"
        variant="outline"
        size="chip"
        onClick={onNewAnimation}
        className={cn(
          'border-dashed self-start text-muted-foreground',
          poseEditorOpen && 'border-solid border-primary text-primary',
        )}
      >
        {poseEditorOpen ? 'Editing Animation…' : '+ New Animation'}
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPlayPause}
          disabled={poseEditorOpen}
          className="rounded-full px-5"
        >
          {isPlaying ? <Pause className="h-3 w-3 mr-1.5" /> : <Play className="h-3 w-3 mr-1.5" />}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>

        <ToggleRow checked={!!showBones} onChange={onToggleBones} label="Show Bones" />
        <ToggleRow
          checked={!!ragdoll}
          onChange={onToggleRagdoll}
          label="Ragdoll"
          disabled={editDisabled}
          title={editTitle}
        />
        <ToggleRow
          checked={!!editStructure || poseEditorOpen}
          onChange={onToggleEditStructure}
          label="Edit Structure"
          disabled={editDisabled}
          title={editTitle}
        />
        <ToggleRow
          checked={!!showVectors}
          onChange={onToggleVectors}
          label="Edit Vectors"
          disabled={editDisabled}
          title={editTitle}
        />
      </div>

      {showVectors && (
        <div className="flex justify-center gap-4 flex-wrap">
          <ToggleRow
            checked={!!rebindMode}
            onChange={onToggleRebindMode}
            label="Rebind Anchor"
            title="Drag an anchor to reattach it to the closest valid bone"
          />
          <ToggleRow
            checked={!!showBinds}
            onChange={onToggleBinds}
            label="Show Binds"
            title="Draw a line from each anchor to the joint it's bound to"
          />
        </div>
      )}

      {showVectors && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Edit:</span>
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
                {color && (
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ background: color }}
                  />
                )}
                {label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
