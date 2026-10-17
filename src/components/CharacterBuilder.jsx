import { useState, useRef, memo } from 'react';
import { CHARACTER_PARTS } from '../data/characterParts.js';
import { CharacterManagerDialog } from './CharacterManagerDialog.jsx';
import { Separator } from '@/components/ui/separator';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils';
import { Bone, ChevronDown, Hand, ImageUp, Pencil, RotateCcw, Users, X } from 'lucide-react';

function BigIconButton({ icon: Icon, label, active, activeClass, inactiveClass, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'h-[84px] w-[84px] rounded-md border transition-colors inline-flex flex-col items-center justify-center gap-1 text-[11px] font-semibold leading-tight text-center',
        active ? activeClass : inactiveClass,
      )}
    >
      <Icon className="h-7 w-7" />
      <span>{label}</span>
    </button>
  );
}

function normalizeHex(text) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  return `#${h.toLowerCase()}`;
}

// Editable HEX field: commits on Enter/blur when valid, reverts otherwise.
function HexInput({ value, onCommit }) {
  const [draft, setDraft] = useState(null);
  const commit = () => {
    const hex = draft === null ? null : normalizeHex(draft);
    if (hex && hex !== value.toLowerCase()) onCommit(hex);
    setDraft(null);
  };
  return (
    <input
      type="text"
      value={draft ?? value.toUpperCase()}
      onChange={e => setDraft(e.target.value)}
      onFocus={e => e.target.select()}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur();
        else if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
      }}
      spellCheck={false}
      maxLength={7}
      title="Edit HEX color"
      className="font-mono text-xs tracking-wide w-[72px] bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none p-0"
    />
  );
}

export const CharacterBuilder = memo(function CharacterBuilder({
  character, characters, activeCharId, currentAnimation,
  onPartChange, onColorChange, onScaleChange,
  onBodyImageChange, onHeadImageChange, onHeadImageScaleChange,
  onAddCharacter, onDeleteCharacter,
  onRenameCharacter, onSelectCharacter, onDuplicateCharacter, onReorderCharacters,
  onEditBodyToggle, onToggleBones, showBones,
  onToggleRagdoll, ragdoll,
  children,
}) {
  const isEdit = currentAnimation === 'edit';
  const [managerOpen, setManagerOpen] = useState(false);
  const activeChar = characters.find(c => c.id === activeCharId) ?? characters[0];
  return (
    <aside className="w-72 shrink-0 bg-card border-r border-border overflow-y-auto p-3 flex flex-col gap-1">
      <div className="flex flex-col gap-1.5 pb-1">
        <SectionTitle>Characters</SectionTitle>
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary hover:border-primary/60 transition-colors text-sm group"
          title="Open character manager"
        >
          <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          <span className="flex-1 text-left text-foreground font-semibold truncate">
            {activeChar?.name ?? '—'}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {characters.length}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </button>
      </div>
      <CharacterManagerDialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        characters={characters}
        activeCharId={activeCharId}
        onSelect={onSelectCharacter}
        onAdd={onAddCharacter}
        onDelete={onDeleteCharacter}
        onRename={onRenameCharacter}
        onDuplicate={onDuplicateCharacter}
        onReorder={onReorderCharacters}
      />
      <div className="mt-1 flex gap-2 self-start">
        <BigIconButton
          icon={Pencil}
          label={isEdit ? 'Close' : 'Edit Structure'}
          active={isEdit}
          onClick={onEditBodyToggle}
          activeClass="bg-yellow-400 border-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]"
          inactiveClass="bg-secondary border-border text-muted-foreground hover:border-yellow-400/60 hover:text-yellow-400"
        />
        <BigIconButton
          icon={Bone}
          label="Show Bones"
          active={showBones}
          onClick={onToggleBones}
          activeClass="bg-primary/20 border-primary text-primary"
          inactiveClass="bg-secondary border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
        />
        <BigIconButton
          icon={Hand}
          label="Ragdoll"
          active={ragdoll}
          onClick={onToggleRagdoll}
          title="Drag the character around — ephemeral, doesn't change config, structure or animation"
          activeClass="bg-rose-400/20 border-rose-400 text-rose-300"
          inactiveClass="bg-secondary border-border text-muted-foreground hover:border-rose-400/60 hover:text-rose-300"
        />
      </div>
      {children}
      {isEdit && (<>
      <Separator className="my-2" />
      <HeadSkinSection
        image={character.headImage}
        scale={character.headImageScale ?? 1}
        onImageChange={onHeadImageChange}
        onScaleChange={onHeadImageScaleChange}
      />
      <Separator className="my-2" />
      <SectionTitle className="text-[13px] mb-2">Parts</SectionTitle>
      {Object.entries(CHARACTER_PARTS).filter(([k]) => k !== 'weapon' && k !== 'lower_torso').map(([partKey, partDef]) => {
        const customColor  = character.customColors?.[partKey] ?? null;
        const presetColor  = CHARACTER_PARTS[partKey].options[character[partKey]]?.color ?? '#888888';
        const currentColor = customColor ?? presetColor;
        const currentScale = character.partScales?.[partKey] ?? 1;
        return (
          <PartSelector
            key={partKey}
            partKey={partKey}
            partDef={partDef}
            selected={character[partKey]}
            currentColor={currentColor}
            hasCustomColor={!!customColor}
            currentScale={currentScale}
            partImage={partKey === 'body' ? character.bodyImage : null}
            onChange={(val) => onPartChange(partKey, val)}
            onColorChange={(hex) => onColorChange(partKey, hex)}
            onScaleChange={(s) => onScaleChange(partKey, s)}
            onPartImageChange={partKey === 'body' ? onBodyImageChange : null}
          />
        );
      })}
      </>)}
    </aside>
  );
});

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.1;

// Character-wide head PNG. One image + size multiplier shared by every
// animation; stored as parts.headImage / parts.headImageScale.
const HEAD_IMG_MIN = 0.3;
const HEAD_IMG_MAX = 3.0;

function HeadSkinSection({ image, scale, onImageChange, onScaleChange }) {
  const inputRef = useRef(null);
  const isDefault = Math.abs(scale - 1) < 0.001;
  const setScale = (v) => onScaleChange(+v.toFixed(2));

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImageChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <SectionTitle className="text-[13px]">Head skin</SectionTitle>
        {image && (
          <button
            type="button"
            onClick={() => onImageChange(null)}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            title="Remove the head PNG (fall back to the vector head)"
          >
            Reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {image ? (
          <img
            src={image}
            alt="Head skin"
            className="w-12 h-12 object-contain rounded border border-teal-400/40 bg-background/40"
          />
        ) : (
          <div className="w-12 h-12 rounded border border-dashed border-border bg-background/40 flex items-center justify-center text-[9px] text-muted-foreground">
            none
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal-400 transition-colors"
          title={image ? 'Replace the head PNG' : 'Upload a PNG to skin the head'}
        >
          <ImageUp className="h-3.5 w-3.5" />
          {image ? 'Replace PNG' : 'Upload PNG'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
        />
      </div>
      {image && (
        <div className="flex items-center justify-end gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Head skin size</span>
          <button
            onClick={() => setScale(Math.max(HEAD_IMG_MIN, scale - 0.1))}
            disabled={scale <= HEAD_IMG_MIN}
            className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
          >−</button>
          <span className={cn('text-[11px] min-w-[32px] text-center font-mono', isDefault ? 'text-muted-foreground' : 'text-primary')}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(Math.min(HEAD_IMG_MAX, scale + 0.1))}
            disabled={scale >= HEAD_IMG_MAX}
            className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
          >+</button>
        </div>
      )}
      <span className="text-[10px] text-muted-foreground/70 leading-relaxed">
        Applies to every animation for this character.
      </span>
    </section>
  );
}

function PartSelector({ partKey, partDef, selected, onChange, currentColor, hasCustomColor, onColorChange, currentScale, onScaleChange, partImage, onPartImageChange }) {
  const colorInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const isShapeSelector = partKey === 'weapon' || partKey === 'head_prop';

  const handleImageFile = (file) => {
    if (!file || !onPartImageChange) return;
    const reader = new FileReader();
    reader.onload = () => onPartImageChange(reader.result);
    reader.readAsDataURL(file);
  };

  const decScale = () => onScaleChange(Math.max(MIN_SCALE, +((currentScale - SCALE_STEP).toFixed(2))));
  const incScale = () => onScaleChange(Math.min(MAX_SCALE, +((currentScale + SCALE_STEP).toFixed(2))));
  const isDefault = Math.abs(currentScale - 1) < 0.001;

  return (
    <section className="py-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <h3 className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {partDef.label}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-0.5">
            <button
              onClick={decScale}
              disabled={currentScale <= MIN_SCALE}
              className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
            >
              −
            </button>
            <span className={cn(
              'text-[11px] min-w-[32px] text-center font-mono',
              isDefault ? 'text-muted-foreground' : 'text-primary',
            )}>
              {Math.round(currentScale * 100)}%
            </span>
            <button
              onClick={incScale}
              disabled={currentScale >= MAX_SCALE}
              className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
            >
              +
            </button>
          </div>
          {!isShapeSelector && (
            <div className="relative flex items-center">
              <button
                className={cn(
                  'w-4 h-4 rounded-full border-2 border-white/20 flex-shrink-0 cursor-pointer transition-transform hover:scale-125 hover:border-white/50',
                  hasCustomColor && 'border-primary ring-1 ring-primary',
                )}
                style={{ background: currentColor }}
                onClick={() => colorInputRef.current?.click()}
                title={hasCustomColor ? 'Custom color — click to change' : 'Pick a custom color'}
              />
              <input
                ref={colorInputRef}
                type="color"
                value={currentColor}
                onChange={e => onColorChange(e.target.value)}
                className="absolute left-full top-1/2 -translate-y-1/2 w-px h-px opacity-0 pointer-events-none border-0 p-0"
              />
            </div>
          )}
        </div>
      </div>

      {isShapeSelector ? (
        <div className="flex flex-wrap gap-1">
          {Object.entries(partDef.options).map(([key, opt]) => (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                'px-2.5 py-1 rounded text-xs whitespace-nowrap border transition-colors',
                selected === key
                  ? 'bg-primary border-primary text-primary-foreground font-semibold'
                  : 'bg-secondary border-border text-foreground hover:border-primary',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/30" style={{ background: currentColor }} />
          <HexInput value={currentColor} onCommit={onColorChange} />
          {hasCustomColor && (
            <button
              onClick={() => onColorChange(null)}
              title="Reset to default color"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
          {onPartImageChange && (
            <>
              <button
                onClick={() => imageInputRef.current?.click()}
                title={partImage ? 'Replace image' : `Upload PNG to skin the ${partDef.label.toLowerCase()}`}
                className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ImageUp className="h-3.5 w-3.5" />
                <span className="text-[11px]">{partImage ? 'Replace' : 'Upload PNG'}</span>
              </button>
              {partImage && (
                <button
                  onClick={() => onPartImageChange(null)}
                  title="Remove image"
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={e => { handleImageFile(e.target.files?.[0]); e.target.value = ''; }}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}

