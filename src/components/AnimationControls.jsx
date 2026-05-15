import { ANIMATIONS, WEAPON_ANIMATION_SETS } from '../systems/AnimationSystem.js';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

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

export function AnimationControls({
  currentAnimation, weapon,
  editAnimPose,
  customAnimations, poseEditorOpen,
  onAnimationChange,
  onNewAnimation, onDeleteAnimation,
}) {
  const allowedKeys = WEAPON_ANIMATION_SETS[weapon ?? 'none'] ?? WEAPON_ANIMATION_SETS.none;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap gap-1.5 border border-border rounded-md p-2">
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
    </div>
  );
}
