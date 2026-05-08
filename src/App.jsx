import { useState, useCallback, useEffect, useRef } from 'react';
import { CharacterCanvas } from './components/CharacterCanvas.jsx';
import { CharacterBuilder } from './components/CharacterBuilder.jsx';
import { AnimationControls } from './components/AnimationControls.jsx';
import { PoseEditor } from './components/PoseEditor.jsx';
import { DEFAULT_CHARACTER } from './data/characterParts.js';
import {
  DEFAULT_BUILD_COLORS,
  DEFAULT_BUILD_BONE_OFFSETS,
  DEFAULT_BUILD_SKIN_OVERRIDES,
} from './data/defaultBuild.js';
import { ANIMATIONS } from './systems/AnimationSystem.js';
import { exportSpriteSheet, exportAnimationJSON } from './utils/export.js';
import { framesToAnimation } from './utils/poseToAnimation.js';
import { mergeOffsets } from './utils/transforms.js';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SectionTitle } from '@/components/ui/section-title';

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
  const [ragdoll,       setRagdoll]       = useState(false);
  const [editStructure, setEditStructure] = useState(false);
  const [rebindMode,    setRebindMode]    = useState(false);
  const [showBinds,     setShowBinds]     = useState(false);
  const [selectedSkin,  setSelectedSkin]  = useState('all');

  // ── Pose editor ───────────────────────────────────────────────────────────────
  const [poseEditorOpen,  setPoseEditorOpen]  = useState(false);
  const [poseFrames,      setPoseFrames]      = useState([]);
  const [activePoseFrame, setActivePoseFrame] = useState(0);
  const [poseAnimName,    setPoseAnimName]    = useState('My Animation');
  const [poseAnimLoop,    setPoseAnimLoop]    = useState(true);
  // Tracks the live ragdoll overlay inside CharacterCanvas so we can commit it on frame switch
  const poseOverlayRef = useRef({});

  const toggleRagdoll = useCallback(() => {
    setRagdoll(p => {
      const next = !p;
      if (next) setEditStructure(false);
      return next;
    });
  }, []);

  const toggleEditStructure = useCallback(() => {
    setEditStructure(p => {
      const next = !p;
      if (next) setRagdoll(false);
      return next;
    });
  }, []);

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
        customAnimations:     (src.customAnimations ?? []).map(a => ({ ...a, tracks: Object.fromEntries(Object.entries(a.tracks).map(([k, kfs]) => [k, kfs.map(kf => ({ ...kf }))])) })),
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

  // ── Pose editor callbacks ─────────────────────────────────────────────────────
  const openPoseEditor = useCallback(() => {
    const char = characters.find(c => c.id === activeCharId) ?? characters[0];
    const firstFrame = { id: genId(), duration: 0.5, boneOffsets: { ...char.boneOffsets } };
    poseOverlayRef.current = {};
    setPoseFrames([firstFrame]);
    setActivePoseFrame(0);
    setPoseAnimName('My Animation');
    setPoseAnimLoop(true);
    setPoseEditorOpen(true);
    setCurrentAnimation('edit');
    setRagdoll(true);
    setEditStructure(false);
    setShowVectors(false);
  }, [activeCharId, characters]);

  const closePoseEditor = useCallback(() => {
    poseOverlayRef.current = {};
    setPoseEditorOpen(false);
    setRagdoll(false);
  }, []);

  // Fired by CharacterCanvas whenever ragdollOverlay changes — keep ref in sync
  const handlePoseRagdollOverlayChange = useCallback((overlay) => {
    poseOverlayRef.current = overlay;
  }, []);

  // Merges the live ragdoll overlay into the active frame's boneOffsets, resets overlay
  const commitCurrentPoseFrame = useCallback((frames, activeIndex) => {
    const overlay = poseOverlayRef.current;
    poseOverlayRef.current = {};
    if (Object.keys(overlay).length === 0) return frames;
    return frames.map((f, i) =>
      i === activeIndex ? { ...f, boneOffsets: mergeOffsets(f.boneOffsets, overlay) } : f
    );
  }, []);

  // boneOffsets changes from canvas are not used in pose editor mode (ragdoll overlay is the source)
  const updatePoseFrameBones = useCallback(() => {}, []);

  const selectPoseFrame = useCallback((newIndex) => {
    setPoseFrames(prev => {
      const committed = commitCurrentPoseFrame(prev, activePoseFrame);
      setActivePoseFrame(newIndex);
      return committed;
    });
  }, [activePoseFrame, commitCurrentPoseFrame]);

  const addPoseFrame = useCallback(() => {
    setPoseFrames(prev => {
      const committed = commitCurrentPoseFrame(prev, activePoseFrame);
      const src = committed[activePoseFrame];
      const newFrame = { id: genId(), duration: 0.5, boneOffsets: { ...src.boneOffsets } };
      const next = [...committed.slice(0, activePoseFrame + 1), newFrame, ...committed.slice(activePoseFrame + 1)];
      setActivePoseFrame(activePoseFrame + 1);
      return next;
    });
  }, [activePoseFrame, commitCurrentPoseFrame]);

  const deletePoseFrame = useCallback((index) => {
    setPoseFrames(prev => {
      const committed = commitCurrentPoseFrame(prev, activePoseFrame);
      const next = committed.filter((_, i) => i !== index);
      setActivePoseFrame(cur => Math.min(cur, next.length - 1));
      return next;
    });
  }, [activePoseFrame, commitCurrentPoseFrame]);

  const duplicatePoseFrame = useCallback((index) => {
    setPoseFrames(prev => {
      const committed = commitCurrentPoseFrame(prev, activePoseFrame);
      const frame = committed[index];
      const copy = { id: genId(), duration: frame.duration, boneOffsets: { ...frame.boneOffsets } };
      const next = [...committed.slice(0, index + 1), copy, ...committed.slice(index + 1)];
      setActivePoseFrame(index + 1);
      return next;
    });
  }, [activePoseFrame, commitCurrentPoseFrame]);

  const updatePoseFrameDuration = useCallback((index, duration) => {
    setPoseFrames(prev => prev.map((f, i) => i === index ? { ...f, duration } : f));
  }, []);

  const createCustomAnimation = useCallback(() => {
    const char = characters.find(c => c.id === activeCharId) ?? characters[0];
    // Commit overlay into the active frame before building the animation
    const finalFrames = commitCurrentPoseFrame(poseFrames, activePoseFrame);
    const anim = framesToAnimation(finalFrames, char.boneOffsets, poseAnimName, poseAnimLoop);
    if (!anim) return;
    setCharacters(prev => prev.map(c =>
      c.id === activeCharId ? { ...c, customAnimations: [...(c.customAnimations ?? []), anim] } : c
    ));
    poseOverlayRef.current = {};
    setPoseEditorOpen(false);
    setRagdoll(false);
    setCurrentAnimation(anim.id);
  }, [activeCharId, activePoseFrame, characters, commitCurrentPoseFrame, poseFrames, poseAnimName, poseAnimLoop]);

  const deleteCustomAnimation = useCallback((animId) => {
    setCharacters(prev => prev.map(c =>
      c.id === activeCharId
        ? { ...c, customAnimations: (c.customAnimations ?? []).filter(a => a.id !== animId) }
        : c
    ));
    setCurrentAnimation(cur => cur === animId ? 'idle' : cur);
  }, [activeCharId]);

  // ── Animation callbacks ───────────────────────────────────────────────────────
  const handleAnimationComplete = useCallback((animKey) => {
    if (['attack', 'jump'].includes(animKey) || !ANIMATIONS[animKey]) {
      setCurrentAnimation('idle');
    }
  }, []);

  const handleAnimationChange = useCallback((key) => {
    setCurrentAnimation(prev => {
      // Snap into a T-pose when first entering edit mode so limbs are spread
      // out and easier to grab. Only applied on the transition into edit.
      // Arm rotations are derived from the character's structural offsets so
      // the forearm bone ends up horizontal regardless of how the elbow is
      // positioned in the build.
      if (key === 'edit' && prev !== 'edit') {
        setCharacters(chars => chars.map(c => {
          if (c.id !== activeCharId) return c;
          const off = c.boneOffsets ?? {};
          // Effective bone-local offsets for elbow (forearm) and wrist (hand).
          const lfx = 0  + (off.left_forearm?.x  ?? 0);
          const lfy = 40 + (off.left_forearm?.y  ?? 0);
          const rfx = 0  + (off.right_forearm?.x ?? 0);
          const rfy = 40 + (off.right_forearm?.y ?? 0);
          const lhx = 0  + (off.left_hand?.x     ?? 0);
          const lhy = 40 + (off.left_hand?.y     ?? 0);
          const rhx = 0  + (off.right_hand?.x    ?? 0);
          const rhy = 40 + (off.right_hand?.y    ?? 0);

          // World rotations needed so each segment lies on the horizontal axis.
          // Left arm extends toward -X (world angle π); right arm toward +X.
          const leftArmWorld   = Math.PI - Math.atan2(lfy, lfx);
          const rightArmWorld  =          -Math.atan2(rfy, rfx);
          const leftFArmWorld  = Math.PI - Math.atan2(lhy, lhx);
          const rightFArmWorld =          -Math.atan2(rhy, rhx);

          // Bone-local rotations: world minus parent's world.
          return {
            ...c,
            boneOffsets: {
              ...off,
              left_arm:      { ...(off.left_arm      ?? {}), rotation: leftArmWorld   },
              right_arm:     { ...(off.right_arm     ?? {}), rotation: rightArmWorld  },
              left_forearm:  { ...(off.left_forearm  ?? {}), rotation: leftFArmWorld  - leftArmWorld  },
              right_forearm: { ...(off.right_forearm ?? {}), rotation: rightFArmWorld - rightArmWorld },
              left_hand:     { ...(off.left_hand     ?? {}), rotation: 0 },
              right_hand:    { ...(off.right_hand    ?? {}), rotation: 0 },
            },
          };
        }));
      }
      return key;
    });
    setIsPlaying(true);
    if (key !== 'edit') {
      setShowVectors(false);
      setRagdoll(false);
      setEditStructure(false);
    }
  }, [activeCharId]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 py-3 border-b border-border bg-card">
        <h1 className="text-xl font-bold text-foreground">
          2D Character Generator
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Skeletal animation · Modular parts · Export ready
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
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

        <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg border border-border overflow-hidden shadow-2xl">
              <CharacterCanvas
                key={poseEditorOpen ? `pose-${activePoseFrame}` : activeCharId}
                character={activeChar.parts}
                boneOffsets={poseEditorOpen ? (poseFrames[activePoseFrame]?.boneOffsets ?? {}) : activeChar.boneOffsets}
                skinOverrides={activeChar.skinOverrides}
                defaultBoneOffsets={activeChar.defaultBoneOffsets}
                defaultSkinOverrides={activeChar.defaultSkinOverrides}
                currentAnimation={currentAnimation}
                isPlaying={isPlaying}
                showBones={showBones}
                showVectors={poseEditorOpen ? false : showVectors}
                ragdoll={poseEditorOpen ? true : ragdoll}
                editStructure={poseEditorOpen ? false : editStructure}
                rebindMode={poseEditorOpen ? false : rebindMode}
                showBinds={poseEditorOpen ? false : showBinds}
                selectedSkin={selectedSkin}
                customAnimations={activeChar.customAnimations}
                onAnimationComplete={handleAnimationComplete}
                onBoneOffsetsChange={poseEditorOpen ? updatePoseFrameBones : updateBoneOffsets}
                onSkinOverridesChange={updateSkinOverrides}
                onRagdollOverlayChange={poseEditorOpen ? handlePoseRagdollOverlayChange : undefined}
                onSaveDefault={saveCharacterDefault}
              />
            </div>

            {poseEditorOpen && (
              <PoseEditor
                character={activeChar.parts}
                skinOverrides={activeChar.skinOverrides}
                frames={poseFrames}
                activeFrame={activePoseFrame}
                animName={poseAnimName}
                animLoop={poseAnimLoop}
                onFrameSelect={selectPoseFrame}
                onFrameAdd={addPoseFrame}
                onFrameDelete={deletePoseFrame}
                onFrameDuplicate={duplicatePoseFrame}
                onFrameDurationChange={updatePoseFrameDuration}
                onNameChange={setPoseAnimName}
                onLoopChange={setPoseAnimLoop}
                onCreate={createCustomAnimation}
                onClose={closePoseEditor}
              />
            )}
          </div>
        </main>

        <aside className="w-[440px] shrink-0 bg-card border-l border-border overflow-y-auto p-4 flex flex-col gap-4">
          <AnimationControls
            currentAnimation={currentAnimation}
            isPlaying={isPlaying}
            showBones={showBones}
            showVectors={showVectors}
            ragdoll={ragdoll}
            editStructure={editStructure}
            rebindMode={rebindMode}
            showBinds={showBinds}
            selectedSkin={selectedSkin}
            customAnimations={activeChar.customAnimations}
            poseEditorOpen={poseEditorOpen}
            onAnimationChange={handleAnimationChange}
            onPlayPause={() => setIsPlaying(p => !p)}
            onToggleBones={() => setShowBones(p => !p)}
            onToggleVectors={() => setShowVectors(p => !p)}
            onToggleRagdoll={toggleRagdoll}
            onToggleEditStructure={toggleEditStructure}
            onToggleRebindMode={() => setRebindMode(p => !p)}
            onToggleBinds={() => setShowBinds(p => !p)}
            onSkinChange={setSelectedSkin}
            onNewAnimation={openPoseEditor}
            onDeleteAnimation={deleteCustomAnimation}
          />

          <Separator />

          <div className="flex flex-col gap-2">
            <SectionTitle>Export</SectionTitle>
            <div className="flex flex-col gap-1.5">
              <Button
                variant="outline"
                className="justify-start text-muted-foreground hover:text-foreground hover:border-emerald-500/60 hover:text-emerald-500"
                onClick={() => exportSpriteSheet(activeChar.parts, currentAnimation, activeChar.boneOffsets, activeChar.skinOverrides)}
              >
                Sprite Sheet (PNG)
              </Button>
              <Button
                variant="outline"
                className="justify-start text-muted-foreground hover:text-foreground hover:border-emerald-500/60 hover:text-emerald-500"
                onClick={() => exportAnimationJSON(currentAnimation)}
              >
                Animation Data (JSON)
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
