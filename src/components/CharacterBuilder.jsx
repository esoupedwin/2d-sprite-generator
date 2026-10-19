import { useState, useRef, useEffect, memo } from 'react';
import { CHARACTER_PARTS } from '../data/characterParts.js';
import { resolveHeadAnim, HEAD_FRAME_MS_MIN, HEAD_FRAME_MS_MAX, HEAD_EVERY_MAX } from '../utils/headAnim.js';
import { CharacterManagerDialog } from './CharacterManagerDialog.jsx';
import { Separator } from '@/components/ui/separator';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils';
import { Bone, ChevronDown, Hand, ImageUp, Pencil, Plus, RotateCcw, Users, X } from 'lucide-react';

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
  onBodyImageChange, onHeadImageChange, onHeadImageFramesChange, onHeadAnimChange, onHeadImageScaleChange,
  onAddCharacter, onDeleteCharacter,
  onRenameCharacter, onSelectCharacter, onDuplicateCharacter, onReorderCharacters,
  onDisplayNameChange,
  folders, onAddFolder, onRenameFolder, onDeleteFolder, onSetCharacterFolder,
  onEditBodyToggle, onToggleBones, showBones,
  onToggleRagdoll, ragdoll,
  children,
}) {
  const isEdit = currentAnimation === 'edit';
  const [managerOpen, setManagerOpen] = useState(false);
  const activeChar = characters.find(c => c.id === activeCharId) ?? characters[0];

  // Display name is edited in a local draft and committed on blur/Enter: every
  // characters-state change re-persists the whole (image-laden) character set,
  // so per-keystroke writes would hitch the canvas.
  const [nameDraft, setNameDraft] = useState(activeChar?.displayName ?? '');
  useEffect(() => { setNameDraft(activeChar?.displayName ?? ''); }, [activeCharId, activeChar?.displayName]);
  const commitDisplayName = () => {
    if (activeChar && nameDraft !== (activeChar.displayName ?? '')) onDisplayNameChange?.(activeChar.id, nameDraft);
  };

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

        {/* Separate from the workspace label above: the character's own name
            (what it's called in-game / on exports). Stored as `displayName`. */}
        <label className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Name</span>
          <input
            type="text"
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={commitDisplayName}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            placeholder="Character name"
            maxLength={60}
            spellCheck={false}
            className="flex-1 min-w-0 h-8 px-2.5 rounded-md border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary transition-colors"
          />
        </label>
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
        folders={folders}
        onAddFolder={onAddFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
        onSetCharacterFolder={onSetCharacterFolder}
      />
      <div className="mt-1 flex gap-2 self-start">
        <BigIconButton
          icon={Pencil}
          label={isEdit ? 'Close' : 'Edit Body'}
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
        frames={character.headImageFrames}
        anim={resolveHeadAnim(character)}
        scale={character.headImageScale ?? 1}
        onImageChange={onHeadImageChange}
        onFramesChange={onHeadImageFramesChange}
        onAnimChange={onHeadAnimChange}
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

// Character-wide head PNG. Frame 0 (parts.headImage) + optional extra frames
// (parts.headImageFrames) form a short sequence such as a blink, timed by
// parts.headAnim; the size multiplier (parts.headImageScale) is shared by
// every animation.
const HEAD_IMG_MIN = 0.3;
const HEAD_IMG_MAX = 3.0;
const HEAD_IMG_STEP = 0.01;

// Reads files as data-URLs, in numeric-aware name order so "1.png, 2.png,
// 10.png" become frames in the order the user numbered them.
function readFilesAsDataUrls(fileList) {
  const files = Array.from(fileList ?? [])
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  return Promise.all(files.map(file => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  }))).then(urls => urls.filter(Boolean));
}

// Small numeric field that commits on blur/Enter: every character-state
// change re-persists the whole image-laden character set, so per-keystroke
// writes would hitch the canvas.
function CommitNumberField({ value, min, max, step = 1, onCommit, className }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    const n = parseFloat(draft);
    if (!Number.isFinite(n)) { setDraft(String(value)); return; }
    const v = Math.min(max, Math.max(min, n));
    setDraft(String(v));
    if (v !== value) onCommit(v);
  };
  return (
    <input
      type="number"
      min={min} max={max} step={step}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      className={cn('h-6 text-center text-[11px] font-mono rounded border border-border bg-secondary text-foreground outline-none focus:border-primary', className)}
    />
  );
}

function HeadSkinSection({ image, frames = [], anim, scale, onImageChange, onFramesChange, onAnimChange, onScaleChange }) {
  const replaceRef = useRef(null);   // single file → replaces frame 0
  const addRef     = useRef(null);   // several files → first becomes frame 0 if missing, rest appended
  const isDefault = Math.abs(scale - 1) < 0.001;
  const setScale = (v) => onScaleChange(+v.toFixed(2));
  const frameCount = image ? 1 + frames.length : 0;

  const handleReplace = async (fileList) => {
    const [url] = await readFilesAsDataUrls(fileList);
    if (url) onImageChange(url);
  };
  const handleAdd = async (fileList) => {
    const urls = await readFilesAsDataUrls(fileList);
    if (!urls.length) return;
    if (!image) {
      onImageChange(urls[0]);
      if (urls.length > 1) onFramesChange(urls.slice(1));
    } else {
      onFramesChange([...frames, ...urls]);
    }
  };
  const removeFrame = (i) => onFramesChange(frames.filter((_, idx) => idx !== i));

  const thumbCls = 'w-10 h-10 object-contain rounded border bg-background/40';

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <SectionTitle className="text-[13px]">Head skin</SectionTitle>
        {image && (
          <button
            type="button"
            onClick={() => onImageChange(null)}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            title="Remove the head PNG and all its frames (fall back to the vector head)"
          >
            Reset
          </button>
        )}
      </div>

      {image ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <img src={image} alt="Head skin frame 1" title="Frame 1 (resting)" className={cn(thumbCls, 'border-teal-400/40')} />
          {frames.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt={`Head skin frame ${i + 2}`} title={`Frame ${i + 2}`} className={cn(thumbCls, 'border-border')} />
              <button
                type="button"
                onClick={() => removeFrame(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-secondary border border-border text-muted-foreground hover:text-destructive hover:border-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title={`Remove frame ${i + 2}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded border border-dashed border-border bg-background/40 flex items-center justify-center text-[9px] text-muted-foreground">
            none
          </div>
          <button
            type="button"
            onClick={() => addRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal-400 transition-colors"
            title="Upload one PNG to skin the head, or several to make a frame sequence"
          >
            <ImageUp className="h-3.5 w-3.5" />
            Upload PNG
          </button>
        </div>
      )}

      {image && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => replaceRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal-400 transition-colors"
            title="Replace frame 1 (the resting head PNG)"
          >
            <ImageUp className="h-3.5 w-3.5" />
            Replace PNG
          </button>
          <button
            type="button"
            onClick={() => addRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal-400 transition-colors"
            title="Add PNG frames after the resting frame (e.g. half-closed and closed eyes for a blink)"
          >
            <Plus className="h-3.5 w-3.5" />
            Add frames
          </button>
        </div>
      )}
      <input
        ref={replaceRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={e => { handleReplace(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={addRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="hidden"
        onChange={e => { handleAdd(e.target.files); e.target.value = ''; }}
      />

      {image && (
        <div className="flex items-center justify-end gap-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Head skin size</span>
          <button
            onClick={() => setScale(Math.max(HEAD_IMG_MIN, scale - HEAD_IMG_STEP))}
            disabled={scale <= HEAD_IMG_MIN}
            className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
          >−</button>
          <span className={cn('text-[11px] min-w-[32px] text-center font-mono', isDefault ? 'text-muted-foreground' : 'text-primary')}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(Math.min(HEAD_IMG_MAX, scale + HEAD_IMG_STEP))}
            disabled={scale >= HEAD_IMG_MAX}
            className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
          >+</button>
        </div>
      )}

      {frameCount > 1 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground" title="How long each frame is shown">
              Frame
              <CommitNumberField
                value={anim.frameMs} min={HEAD_FRAME_MS_MIN} max={HEAD_FRAME_MS_MAX} step={10}
                onCommit={v => onAnimChange({ frameMs: Math.round(v) })}
                className="w-14"
              />
              ms
            </label>
            <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground" title="Seconds from one play to the next; 0 = loop continuously">
              Every
              <CommitNumberField
                value={anim.every} min={0} max={HEAD_EVERY_MAX} step={0.1}
                onCommit={v => onAnimChange({ every: +v.toFixed(2) })}
                className="w-12"
              />
              s
            </label>
            <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer" title="Play the frames forward then back (1 2 3 2) — what a blink needs">
              <input
                type="checkbox"
                checked={!!anim.bounce}
                onChange={e => onAnimChange({ bounce: e.target.checked })}
                className="accent-teal-400"
              />
              Bounce
            </label>
          </div>
          <span className="text-[10px] text-muted-foreground/70 leading-relaxed">
            {frameCount} frames{anim.bounce ? ', played forward then back' : ''}.
            A sprite sheet covers one loop of the action, so it only contains the sequence when <em>Every</em> is at or below the action length.
          </span>
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

