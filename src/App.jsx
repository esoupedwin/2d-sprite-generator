import { useState, useCallback, useEffect, useRef } from 'react';
import { CharacterCanvas } from './components/CharacterCanvas.jsx';
import { CharacterBuilder } from './components/CharacterBuilder.jsx';
import { AnimationControls } from './components/AnimationControls.jsx';
import { DEFAULT_CHARACTER } from './data/characterParts.js';
import {
  DEFAULT_BUILD_COLORS,
  DEFAULT_BUILD_BONE_OFFSETS,
  DEFAULT_BUILD_SKIN_OVERRIDES,
} from './data/defaultBuild.js';
import { exportSpriteSheet, exportAnimationJSON } from './utils/export.js';

const CHARS_STORAGE = '2dsprite:characters';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function cloneSkinOverrides(src) {
  return Object.fromEntries(Object.entries(src).map(([k, pts]) => [k, pts.map(p => [...p])]));
}

function newCharacter(name) {
  const boneOffsets   = Object.fromEntries(Object.entries(DEFAULT_BUILD_BONE_OFFSETS).map(([k, v]) => [k, { ...v }]));
  const skinOverrides = cloneSkinOverrides(DEFAULT_BUILD_SKIN_OVERRIDES);
  return {
    id: genId(),
    name,
    parts: { ...DEFAULT_CHARACTER, customColors: { ...DEFAULT_BUILD_COLORS } },
    boneOffsets,
    skinOverrides,
    defaultBoneOffsets:   Object.fromEntries(Object.entries(DEFAULT_BUILD_BONE_OFFSETS).map(([k, v]) => [k, { ...v }])),
    defaultSkinOverrides: cloneSkinOverrides(DEFAULT_BUILD_SKIN_OVERRIDES),
  };
}

function loadCharactersFromStorage() {
  try {
    const arr = JSON.parse(localStorage.getItem(CHARS_STORAGE));
    if (Array.isArray(arr) && arr.length > 0) return arr;
  } catch {}

  // Migrate from old single-character format
  try {
    const oldBones = JSON.parse(localStorage.getItem('2dsprite:boneOffsets') || 'null') ?? {};
    const oldSkins = JSON.parse(localStorage.getItem('2dsprite:skinOverrides') || 'null') ?? {};
    if (Object.keys(oldBones).length > 0 || Object.keys(oldSkins).length > 0) {
      const char = newCharacter('Character 1');
      char.boneOffsets         = oldBones;
      char.skinOverrides        = oldSkins;
      char.defaultBoneOffsets  = oldBones;
      char.defaultSkinOverrides = oldSkins;
      return [char];
    }
  } catch {}

  return null;
}

function persistCharacters(chars) {
  try { localStorage.setItem(CHARS_STORAGE, JSON.stringify(chars)); } catch {}
  fetch('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chars),
  }).catch(() => {});
}

export default function App() {
  const [characters, setCharacters] = useState(() => {
    return loadCharactersFromStorage() ?? [newCharacter('Character 1')];
  });
  const [activeCharId, setActiveCharId] = useState(() => characters[0]?.id ?? null);

  const [currentAnimation, setCurrentAnimation] = useState('idle');
  const [isPlaying,    setIsPlaying]    = useState(true);
  const [showBones,    setShowBones]    = useState(false);
  const [showVectors,  setShowVectors]  = useState(false);
  const [selectedSkin, setSelectedSkin] = useState('all');

  const activeChar = characters.find(c => c.id === activeCharId) ?? characters[0];

  // Debounced persist on every characters change
  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistCharacters(characters), 600);
    return () => clearTimeout(saveTimer.current);
  }, [characters]);

  // On mount: load from file — file wins over localStorage
  useEffect(() => {
    fetch('/api/characters')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCharacters(data);
          setActiveCharId(data[0].id);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Character CRUD ────────────────────────────────────────────────────────────
  const addCharacter = useCallback(() => {
    setCharacters(prev => {
      const char = newCharacter(`Character ${prev.length + 1}`);
      setActiveCharId(char.id);
      setCurrentAnimation('idle');
      return [...prev, char];
    });
  }, []);

  const deleteCharacter = useCallback((id) => {
    setCharacters(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) {
        const fallback = newCharacter('Character 1');
        setActiveCharId(fallback.id);
        return [fallback];
      }
      setActiveCharId(cur => cur === id ? next[0].id : cur);
      return next;
    });
  }, []);

  const renameCharacter = useCallback((id, name) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  }, []);

  const selectCharacter = useCallback((id) => {
    setActiveCharId(id);
    setCurrentAnimation('idle');
    setShowVectors(false);
  }, []);

  const duplicateCharacter = useCallback((id) => {
    setCharacters(prev => {
      const src = prev.find(c => c.id === id);
      if (!src) return prev;
      const copy = {
        ...src,
        id:   genId(),
        name: `${src.name} copy`,
        parts:                { ...src.parts, customColors: { ...(src.parts.customColors ?? {}) }, partScales: { ...(src.parts.partScales ?? {}) } },
        boneOffsets:          { ...src.boneOffsets },
        skinOverrides:        Object.fromEntries(Object.entries(src.skinOverrides).map(([k, pts]) => [k, pts.map(p => [...p])])),
        defaultBoneOffsets:   { ...src.defaultBoneOffsets },
        defaultSkinOverrides: Object.fromEntries(Object.entries(src.defaultSkinOverrides).map(([k, pts]) => [k, pts.map(p => [...p])])),
      };
      setActiveCharId(copy.id);
      return [...prev, copy];
    });
  }, []);

  // ── Active character mutations (called from CharacterCanvas) ──────────────────
  const updatePart = useCallback((partKey, optionKey) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      // Selecting a preset clears any custom color for that part
      const customColors = { ...(c.parts.customColors ?? {}) };
      delete customColors[partKey];
      return { ...c, parts: { ...c.parts, [partKey]: optionKey, customColors } };
    }));
  }, [activeCharId]);

  const updateColor = useCallback((partKey, hexColor) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const customColors = { ...(c.parts.customColors ?? {}) };
      if (hexColor) customColors[partKey] = hexColor;
      else delete customColors[partKey];
      return { ...c, parts: { ...c.parts, customColors } };
    }));
  }, [activeCharId]);

  const updatePartScale = useCallback((partKey, scale) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const partScales = { ...(c.parts.partScales ?? {}) };
      if (Math.abs(scale - 1) < 0.001) delete partScales[partKey];
      else partScales[partKey] = scale;
      return { ...c, parts: { ...c.parts, partScales } };
    }));
  }, [activeCharId]);

  const updateBoneOffsets = useCallback((newOffsets) => {
    setCharacters(prev => prev.map(c =>
      c.id === activeCharId ? { ...c, boneOffsets: newOffsets } : c
    ));
  }, [activeCharId]);

  const updateSkinOverrides = useCallback((newSkins) => {
    setCharacters(prev => prev.map(c =>
      c.id === activeCharId ? { ...c, skinOverrides: newSkins } : c
    ));
  }, [activeCharId]);

  const saveCharacterDefault = useCallback((boneOffsets, skinOverrides) => {
    setCharacters(prev => prev.map(c =>
      c.id === activeCharId
        ? { ...c, boneOffsets, skinOverrides, defaultBoneOffsets: boneOffsets, defaultSkinOverrides: skinOverrides }
        : c
    ));
  }, [activeCharId]);

  // ── Animation callbacks ───────────────────────────────────────────────────────
  const handleAnimationComplete = useCallback((animName) => {
    if (animName === 'attack' || animName === 'jump') setCurrentAnimation('idle');
  }, []);

  const handleAnimationChange = useCallback((key) => {
    setCurrentAnimation(key);
    setIsPlaying(true);
    if (key !== 'idle') setShowVectors(false);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>2D Character Generator</h1>
        <p className="subtitle">Skeletal animation · Modular parts · Export ready</p>
      </header>

      <div className="app-body">
        <CharacterBuilder
          character={activeChar.parts}
          characters={characters}
          activeCharId={activeCharId}
          onPartChange={updatePart}
          onColorChange={updateColor}
          onScaleChange={updatePartScale}
          onAddCharacter={addCharacter}
          onDeleteCharacter={deleteCharacter}
          onRenameCharacter={renameCharacter}
          onSelectCharacter={selectCharacter}
          onDuplicateCharacter={duplicateCharacter}
        />

        <main className="center-panel">
          <div className="canvas-wrapper">
            <CharacterCanvas
              key={activeCharId}
              character={activeChar.parts}
              boneOffsets={activeChar.boneOffsets}
              skinOverrides={activeChar.skinOverrides}
              defaultBoneOffsets={activeChar.defaultBoneOffsets}
              defaultSkinOverrides={activeChar.defaultSkinOverrides}
              currentAnimation={currentAnimation}
              isPlaying={isPlaying}
              showBones={showBones}
              showVectors={showVectors}
              selectedSkin={selectedSkin}
              onAnimationComplete={handleAnimationComplete}
              onBoneOffsetsChange={updateBoneOffsets}
              onSkinOverridesChange={updateSkinOverrides}
              onSaveDefault={saveCharacterDefault}
            />
          </div>
        </main>

        <aside className="controls-panel">
          <AnimationControls
            currentAnimation={currentAnimation}
            isPlaying={isPlaying}
            showBones={showBones}
            showVectors={showVectors}
            selectedSkin={selectedSkin}
            onAnimationChange={handleAnimationChange}
            onPlayPause={() => setIsPlaying(p => !p)}
            onToggleBones={() => setShowBones(p => !p)}
            onToggleVectors={() => setShowVectors(p => !p)}
            onSkinChange={setSelectedSkin}
          />

          <div className="divider" />

          <div className="export-section">
            <span className="export-label">Export</span>
            <div className="export-buttons">
              <button
                className="export-btn"
                onClick={() => exportSpriteSheet(activeChar.parts, currentAnimation, activeChar.boneOffsets, activeChar.skinOverrides)}
              >
                Sprite Sheet (PNG)
              </button>
              <button
                className="export-btn"
                onClick={() => exportAnimationJSON(currentAnimation)}
              >
                Animation Data (JSON)
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
