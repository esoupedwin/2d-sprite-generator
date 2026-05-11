import { useState, useRef } from 'react';
import { CHARACTER_PARTS } from '../data/characterParts.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils';
import { Copy, ImageUp, Pencil, Plus, RotateCcw, X } from 'lucide-react';

export function CharacterBuilder({
  character, characters, activeCharId,
  onPartChange, onColorChange, onScaleChange,
  onBodyImageChange, onHeadImageChange,
  onAddCharacter, onDeleteCharacter,
  onRenameCharacter, onSelectCharacter, onDuplicateCharacter,
}) {
  return (
    <aside className="w-60 shrink-0 bg-card border-r border-border overflow-y-auto p-3 flex flex-col gap-1">
      <CharacterList
        characters={characters}
        activeCharId={activeCharId}
        onSelect={onSelectCharacter}
        onAdd={onAddCharacter}
        onDelete={onDeleteCharacter}
        onRename={onRenameCharacter}
        onDuplicate={onDuplicateCharacter}
      />
      <Separator className="my-2" />
      <SectionTitle className="text-[13px] mb-2">Parts</SectionTitle>
      {Object.entries(CHARACTER_PARTS).filter(([k]) => k !== 'weapon').map(([partKey, partDef]) => {
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
            partImage={
              partKey === 'body' ? character.bodyImage :
              partKey === 'head' ? character.headImage :
              null
            }
            onChange={(val) => onPartChange(partKey, val)}
            onColorChange={(hex) => onColorChange(partKey, hex)}
            onScaleChange={(s) => onScaleChange(partKey, s)}
            onPartImageChange={
              partKey === 'body' ? onBodyImageChange :
              partKey === 'head' ? onHeadImageChange :
              null
            }
          />
        );
      })}
    </aside>
  );
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.1;

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
          <span className="font-mono text-xs tracking-wide">{currentColor.toUpperCase()}</span>
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
                onChange={e => handleImageFile(e.target.files?.[0])}
              />
            </>
          )}
        </div>
      )}
    </section>
  );
}

function CharacterList({ characters, activeCharId, onSelect, onAdd, onDelete, onRename, onDuplicate }) {
  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState('');

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

  return (
    <div className="flex flex-col gap-1.5 pb-1">
      <div className="flex items-center justify-between">
        <SectionTitle>Characters</SectionTitle>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onAdd}
          title="New character"
          className="h-[22px] w-[22px]"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-col gap-0.5 max-h-[140px] overflow-y-auto">
        {characters.map(char => {
          const isActive = char.id === activeCharId;
          return (
            <div
              key={char.id}
              onClick={() => onSelect(char.id)}
              className={cn(
                'group flex items-center gap-1 px-2 py-1.5 rounded border cursor-pointer min-h-[30px] bg-secondary transition-colors',
                isActive
                  ? 'border-primary bg-primary/15'
                  : 'border-transparent hover:border-border',
              )}
            >
              {editingId === char.id ? (
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
                  className="h-6 text-xs px-1.5"
                />
              ) : (
                <span
                  onDoubleClick={e => startEdit(char, e)}
                  title="Double-click to rename"
                  className={cn(
                    'flex-1 text-xs truncate select-none',
                    isActive && 'font-semibold text-foreground',
                  )}
                >
                  {char.name}
                </span>
              )}

              <div className={cn(
                'flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                isActive && 'opacity-100',
              )}>
                <button
                  onClick={e => { e.stopPropagation(); startEdit(char, e); }}
                  title="Rename"
                  className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded p-0.5 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDuplicate(char.id); }}
                  title="Duplicate"
                  className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded p-0.5 transition-colors"
                >
                  <Copy className="h-3 w-3" />
                </button>
                {characters.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(char.id); }}
                    title="Delete"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
