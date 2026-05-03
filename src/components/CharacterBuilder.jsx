import { useState, useRef } from 'react';
import { CHARACTER_PARTS } from '../data/characterParts.js';

export function CharacterBuilder({
  character, characters, activeCharId,
  onPartChange, onColorChange,
  onAddCharacter, onDeleteCharacter,
  onRenameCharacter, onSelectCharacter, onDuplicateCharacter,
}) {
  return (
    <aside className="builder-panel">
      <CharacterList
        characters={characters}
        activeCharId={activeCharId}
        onSelect={onSelectCharacter}
        onAdd={onAddCharacter}
        onDelete={onDeleteCharacter}
        onRename={onRenameCharacter}
        onDuplicate={onDuplicateCharacter}
      />
      <div className="divider" />
      <h2>Parts</h2>
      {Object.entries(CHARACTER_PARTS).map(([partKey, partDef]) => {
        const customColor  = character.customColors?.[partKey] ?? null;
        const presetColor  = CHARACTER_PARTS[partKey].options[character[partKey]]?.color ?? '#888888';
        const currentColor = customColor ?? presetColor;
        return (
          <PartSelector
            key={partKey}
            partKey={partKey}
            partDef={partDef}
            selected={character[partKey]}
            currentColor={currentColor}
            hasCustomColor={!!customColor}
            onChange={(val) => onPartChange(partKey, val)}
            onColorChange={(hex) => onColorChange(partKey, hex)}
          />
        );
      })}
    </aside>
  );
}

function PartSelector({ partKey, partDef, selected, onChange, currentColor, hasCustomColor, onColorChange }) {
  const colorInputRef = useRef(null);
  const isShapeSelector = partKey === 'weapon' || partKey === 'head_prop';

  return (
    <section className="builder-section">
      <div className="part-header">
        <h3>{partDef.label}</h3>
        {!isShapeSelector && (
          <div className="color-swatch-wrap">
            <button
              className={`color-swatch-btn${hasCustomColor ? ' custom' : ''}`}
              style={{ background: currentColor }}
              onClick={() => colorInputRef.current?.click()}
              title={hasCustomColor ? 'Custom color — click to change' : 'Pick a custom color'}
            />
            <input
              ref={colorInputRef}
              type="color"
              value={currentColor}
              onChange={e => onColorChange(e.target.value)}
              className="color-picker-input"
            />
          </div>
        )}
      </div>

      {isShapeSelector ? (
        <div className="option-row wrap">
          {Object.entries(partDef.options).map(([key, opt]) => (
            <button
              key={key}
              className={`option-btn ${selected === key ? 'active' : ''}`}
              onClick={() => onChange(key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="color-display">
          <span className="color-dot-lg" style={{ background: currentColor }} />
          <span className="color-hex">{currentColor.toUpperCase()}</span>
          {hasCustomColor && (
            <button
              className="color-reset-btn"
              onClick={() => onColorChange(null)}
              title="Reset to default color"
            >↺</button>
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
    <div className="char-list">
      <div className="char-list-header">
        <span className="char-list-title">Characters</span>
        <button className="char-add-btn" onClick={onAdd} title="New character">+</button>
      </div>

      <div className="char-slots">
        {characters.map(char => (
          <div
            key={char.id}
            className={`char-slot ${char.id === activeCharId ? 'active' : ''}`}
            onClick={() => onSelect(char.id)}
          >
            {editingId === char.id ? (
              <input
                autoFocus
                className="char-name-input"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => commitEdit(char.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  commitEdit(char.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                className="char-name"
                onDoubleClick={e => startEdit(char, e)}
                title="Double-click to rename"
              >
                {char.name}
              </span>
            )}

            <div className="char-actions">
              <button
                className="char-action-btn"
                onClick={e => { e.stopPropagation(); startEdit(char, e); }}
                title="Rename"
              >✎</button>
              <button
                className="char-action-btn"
                onClick={e => { e.stopPropagation(); onDuplicate(char.id); }}
                title="Duplicate"
              >⧉</button>
              {characters.length > 1 && (
                <button
                  className="char-action-btn char-delete-btn"
                  onClick={e => { e.stopPropagation(); onDelete(char.id); }}
                  title="Delete"
                >×</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
