import { useState, useRef, useEffect, memo } from 'react';
import { CHARACTER_PARTS } from '../data/characterParts.js';
import { resolveHeadAnim, HEAD_FRAME_MS_MIN, HEAD_FRAME_MS_MAX, HEAD_EVERY_MAX } from '../utils/headAnim.js';
import { CharacterManagerDialog } from './CharacterManagerDialog.jsx';
import { Separator } from '@/components/ui/separator';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils';
import { Bone, ChevronDown, Hand, ImageUp, Pencil, Plus, RotateCcw, Users, X } from 'lucide-react';

// Mode toggle cell for the 3-column grid under the character selector.
function BigIconButton({ icon: Icon, label, active, activeClass, inactiveClass, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'h-[64px] w-full rounded-md border transition-colors inline-flex flex-col items-center justify-center gap-1.5 text-[10.5px] font-medium leading-none',
        active ? activeClass : inactiveClass,
      )}
    >
      <Icon className="h-5 w-5" />
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
  onRenameCharacter, onSelectCharacter, onDuplicateCharacter, onMergeCharacters, onReorderCharacters,
  onDisplayNameChange, onSpecialChange,
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
    <aside className="w-72 shrink-0 bg-card border-r border-border overflow-y-auto p-3 flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <SectionTitle>Characters</SectionTitle>
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-secondary hover:border-primary/60 transition-colors text-sm group"
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
        <label className="flex items-center h-8 rounded-md border border-transparent bg-secondary/50 hover:border-border focus-within:border-primary transition-colors">
          <span className="pl-3 pr-2 text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">Name</span>
          <input
            type="text"
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={commitDisplayName}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            placeholder="in-game name"
            maxLength={60}
            spellCheck={false}
            className="flex-1 min-w-0 h-full pr-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
        </label>

        {/* Marks a character as special (stored as `special: true`). */}
        <label className="flex items-center gap-2 px-3 h-7 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!activeChar?.special}
            onChange={e => activeChar && onSpecialChange?.(activeChar.id, e.target.checked)}
            className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
          />
          <span className="text-xs text-foreground">Special character</span>
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
        onMerge={onMergeCharacters}
        onReorder={onReorderCharacters}
        folders={folders}
        onAddFolder={onAddFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
        onSetCharacterFolder={onSetCharacterFolder}
      />
      <div className="grid grid-cols-3 gap-2">
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
      <Separator />
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
      <Separator />
      <SectionTitle>Parts</SectionTitle>
      <div className="flex flex-col divide-y divide-border/50 -mt-1">
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
      </div>
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

const STEP_BTN = 'w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors';

/** −/value/+ percentage stepper used for every size control in the panel. */
function Stepper({ value, min, max, step, onChange }) {
  const isDefault = Math.abs(value - 1) < 0.001;
  const set = (v) => onChange(+Math.min(max, Math.max(min, v)).toFixed(2));
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button type="button" className={STEP_BTN} disabled={value <= min} onClick={() => set(value - step)}>−</button>
      <span className={cn('text-[11px] min-w-[36px] text-center font-mono tabular-nums', isDefault ? 'text-muted-foreground' : 'text-primary')}>
        {Math.round(value * 100)}%
      </span>
      <button type="button" className={STEP_BTN} disabled={value >= max} onClick={() => set(value + step)}>+</button>
    </div>
  );
}

/** Label-left / control-right row for the settings grids. */
function SettingRow({ label, title, children }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[24px]" title={title}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

const SMALL_BTN = 'inline-flex items-center justify-center gap-1.5 h-8 rounded-md border border-border bg-secondary text-xs text-foreground hover:border-primary/60 transition-colors';

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
      <div className="flex items-center justify-between">
        <SectionTitle>Head skin</SectionTitle>
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

      {/* Frame strip (frame 1 = resting), with an add tile at the end */}
      <div className="flex flex-wrap items-center gap-1.5">
        {image && (
          <img src={image} alt="Head skin frame 1" title="Frame 1 (resting)" className={cn(thumbCls, 'border-teal-400/40')} />
        )}
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
        <button
          type="button"
          onClick={() => addRef.current?.click()}
          className="w-10 h-10 rounded border border-dashed border-border text-muted-foreground hover:border-teal-400/60 hover:text-teal-400 flex items-center justify-center transition-colors"
          title={image ? 'Add PNG frames after the resting frame (e.g. half-closed and closed eyes for a blink)' : 'Upload one PNG to skin the head, or several to make a frame sequence'}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {image && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => replaceRef.current?.click()} className={SMALL_BTN} title="Replace frame 1 (the resting head PNG)">
            <ImageUp className="h-3.5 w-3.5" /> Replace PNG
          </button>
          <button type="button" onClick={() => addRef.current?.click()} className={SMALL_BTN} title="Add PNG frames after the resting frame">
            <Plus className="h-3.5 w-3.5" /> Add frames
          </button>
        </div>
      )}
      <input ref={replaceRef} type="file" accept="image/png,image/jpeg" className="hidden"
        onChange={e => { handleReplace(e.target.files); e.target.value = ''; }} />
      <input ref={addRef} type="file" accept="image/png,image/jpeg" multiple className="hidden"
        onChange={e => { handleAdd(e.target.files); e.target.value = ''; }} />

      {image && (
        <div className="flex flex-col gap-1 rounded-md border border-border/50 bg-secondary/30 px-2.5 py-2">
          <SettingRow label="Size">
            <Stepper value={scale} min={HEAD_IMG_MIN} max={HEAD_IMG_MAX} step={HEAD_IMG_STEP} onChange={onScaleChange} />
          </SettingRow>
          {frameCount > 1 && (
            <>
              <SettingRow label="Frame" title="How long each frame is shown">
                <CommitNumberField value={anim.frameMs} min={HEAD_FRAME_MS_MIN} max={HEAD_FRAME_MS_MAX} step={10}
                  onCommit={v => onAnimChange({ frameMs: Math.round(v) })} className="w-14" />
                <span className="text-[10px] text-muted-foreground w-5">ms</span>
              </SettingRow>
              <SettingRow label="Every" title="Seconds from one play to the next in the live preview; 0 = loop continuously">
                <CommitNumberField value={anim.every} min={0} max={HEAD_EVERY_MAX} step={0.1}
                  onCommit={v => onAnimChange({ every: +v.toFixed(2) })} className="w-14" />
                <span className="text-[10px] text-muted-foreground w-5">s</span>
              </SettingRow>
              <SettingRow label="Bounce" title="Play the frames forward then back (1 2 3 2) — what a blink needs">
                <input type="checkbox" checked={!!anim.bounce} onChange={e => onAnimChange({ bounce: e.target.checked })} className="accent-teal-400 mr-[26px]" />
              </SettingRow>
            </>
          )}
        </div>
      )}

      <span className="text-[10px] text-muted-foreground/70 leading-relaxed">
        {frameCount > 1
          ? <>{frameCount} frames{anim.bounce ? ', forward then back' : ''}. Sprite sheets export one play at the start of each action; the preview plays it {anim.every > 0 ? `every ${anim.every} s` : 'continuously'}. </>
          : null}
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

  return (
    <section className="py-2 flex flex-col gap-1.5">
      {/* Row 1: swatch (= colour picker) + name on the left, size on the right */}
      <div className="flex items-center gap-2">
        {!isShapeSelector && (
          <div className="relative flex items-center shrink-0">
            <button
              type="button"
              className={cn(
                'w-3.5 h-3.5 rounded-full ring-1 ring-black/30 transition-transform hover:scale-125',
                hasCustomColor && 'ring-2 ring-primary',
              )}
              style={{ background: currentColor }}
              onClick={() => colorInputRef.current?.click()}
              title={hasCustomColor ? 'Custom colour — click to change' : 'Pick a custom colour'}
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
        <h3 className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {partDef.label}
        </h3>
        <Stepper value={currentScale} min={MIN_SCALE} max={MAX_SCALE} step={SCALE_STEP} onChange={onScaleChange} />
      </div>

      {/* Row 2: hex + reset on the left; PNG skin controls on the right (body only) */}
      {isShapeSelector ? (
        <div className="flex flex-wrap gap-1">
          {Object.entries(partDef.options).map(([key, opt]) => (
            <button
              key={key}
              type="button"
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
        <div className="flex items-center gap-2 pl-[22px]">
          <HexInput value={currentColor} onCommit={onColorChange} />
          {hasCustomColor && (
            <button type="button" onClick={() => onColorChange(null)} title="Reset to default colour"
              className="text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
          {onPartImageChange && (
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                title={partImage ? 'Replace the PNG skin' : `Upload a PNG to skin the ${partDef.label.toLowerCase()}`}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ImageUp className="h-3.5 w-3.5" />
                {partImage ? 'Replace PNG' : 'Upload PNG'}
              </button>
              {partImage && (
                <button type="button" onClick={() => onPartImageChange(null)} title="Remove PNG skin"
                  className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              )}
              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
                onChange={e => { handleImageFile(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
