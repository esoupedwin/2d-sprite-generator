import { SKIN_COLORS } from '../systems/VectorEditor.js';
import { SectionTitle } from '@/components/ui/section-title';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const SKIN_OPTIONS = [
  { key: 'all', label: 'All' },
  ...Object.entries(SKIN_COLORS).map(([key, c]) => ({ key, label: c.label, color: c.anchor })),
];

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

const MIN_SCALE  = 0.5;
const MAX_SCALE  = 3.0;
const SCALE_STEP = 0.1;

const MIN_NECK = 20;
const MAX_NECK = 140;

export function EditBodyControls({
  showVectors, ragdoll, editStructure, rebindMode, showBinds, selectedSkin,
  poseEditorOpen,
  headScale, neckLength,
  onToggleVectors, onToggleRagdoll, onToggleEditStructure,
  onToggleRebindMode, onToggleBinds, onSkinChange,
  onHeadScaleChange, onNeckLengthChange,
}) {
  const disabled = poseEditorOpen;
  const title    = poseEditorOpen ? 'Close pose editor first' : '';

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <SectionTitle>Edit Body Controls</SectionTitle>
        <div className="flex gap-1.5 flex-wrap" title={title}>
          <ModeBtn active={!!ragdoll}       disabled={disabled} onClick={onToggleRagdoll}>Ragdoll</ModeBtn>
          <ModeBtn active={!!editStructure} disabled={disabled} onClick={onToggleEditStructure}>Edit Structure</ModeBtn>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2.5">
        <SectionTitle>Edit Body Parts</SectionTitle>
        <div className="flex gap-1.5 flex-wrap" title={title}>
          <ModeBtn active={!!showVectors} disabled={disabled} onClick={onToggleVectors}>Vectors</ModeBtn>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Head Size</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onHeadScaleChange(Math.max(MIN_SCALE, +((headScale - SCALE_STEP).toFixed(2))))}
                className="w-5 h-5 flex items-center justify-center text-xs rounded border border-border hover:border-primary/60 hover:text-foreground text-muted-foreground select-none"
              >−</button>
              <span className="text-xs w-10 text-center tabular-nums">{Math.round(headScale * 100)}%</span>
              <button
                type="button"
                onClick={() => onHeadScaleChange(Math.min(MAX_SCALE, +((headScale + SCALE_STEP).toFixed(2))))}
                className="w-5 h-5 flex items-center justify-center text-xs rounded border border-border hover:border-primary/60 hover:text-foreground text-muted-foreground select-none"
              >+</button>
              {Math.abs(headScale - 1) >= 0.001 && (
                <button
                  type="button"
                  onClick={() => onHeadScaleChange(1)}
                  className="ml-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  title="Reset to 100%"
                >↺</button>
              )}
            </div>
          </div>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={SCALE_STEP}
            value={headScale}
            onChange={e => onHeadScaleChange(+parseFloat(e.target.value).toFixed(2))}
            className="w-full h-1.5 accent-primary cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Neck Length</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onNeckLengthChange(Math.max(MIN_NECK, Math.round(neckLength) - 1))}
                className="w-5 h-5 flex items-center justify-center text-xs rounded border border-border hover:border-primary/60 hover:text-foreground text-muted-foreground select-none"
              >−</button>
              <span className="text-xs w-10 text-center tabular-nums">{Math.round(neckLength)}</span>
              <button
                type="button"
                onClick={() => onNeckLengthChange(Math.min(MAX_NECK, Math.round(neckLength) + 1))}
                className="w-5 h-5 flex items-center justify-center text-xs rounded border border-border hover:border-primary/60 hover:text-foreground text-muted-foreground select-none"
              >+</button>
              {Math.abs(Math.round(neckLength) - 72) >= 1 && (
                <button
                  type="button"
                  onClick={() => onNeckLengthChange(72)}
                  className="ml-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  title="Reset to default"
                >↺</button>
              )}
            </div>
          </div>
          <input
            type="range"
            min={MIN_NECK}
            max={MAX_NECK}
            step={1}
            value={Math.round(neckLength)}
            onChange={e => onNeckLengthChange(+parseInt(e.target.value))}
            className="w-full h-1.5 accent-primary cursor-pointer"
          />
        </div>

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
    </>
  );
}
