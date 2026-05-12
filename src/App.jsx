import { useState, useCallback, useEffect, useRef } from 'react';
import { CharacterCanvas } from './components/CharacterCanvas.jsx';
import { CharacterBuilder } from './components/CharacterBuilder.jsx';
import { AnimationControls } from './components/AnimationControls.jsx';
import { PoseEditor } from './components/PoseEditor.jsx';
import { ExportMenu } from './components/ExportMenu.jsx';
import { AnimationCurvePanel } from './components/AnimationCurvePanel.jsx';
import { WeaponUploadDialog } from './components/WeaponUploadDialog.jsx';
import { CHARACTER_PARTS, DEFAULT_CHARACTER } from './data/characterParts.js';
import {
  DEFAULT_BUILD_COLORS,
  DEFAULT_BUILD_BONE_OFFSETS,
  DEFAULT_BUILD_SKIN_OVERRIDES,
  DEFAULT_ANIM_BONE_OFFSETS,
  DEFAULT_ANIM_KEYFRAME_OVERRIDES,
  DEFAULT_WEAPON_OFFSETS,
  DEFAULT_WEAPON_ANIM_OFFSETS,
  DEFAULT_WEAPON_SCALES,
} from './data/defaultBuild.js';
import { ANIMATIONS, WEAPON_DEFAULT_ANIMATIONS, resolveAnimation } from './systems/AnimationSystem.js';
import { exportSpriteSheet, exportAnimationJSON } from './utils/export.js';
import { framesToAnimation } from './utils/poseToAnimation.js';
import { mergeOffsets } from './utils/transforms.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SectionTitle } from '@/components/ui/section-title';
import { ImageUp, X } from 'lucide-react';

const CHARS_STORAGE = '2dsprite:characters';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function cloneSkinOverrides(src) {
  return Object.fromEntries(Object.entries(src).map(([k, pts]) => [k, pts.map(p => [...p])]));
}

// Deep-clone nested {anim: {bone: {x,y,rotation}}} or similar 2/3-level dicts
// so each new character starts with its own copy of the defaults.
function cloneNested(src, depth = 2) {
  if (src == null) return src;
  if (depth === 0) return Array.isArray(src) ? src.slice() : { ...src };
  return Object.fromEntries(
    Object.entries(src).map(([k, v]) => [k, cloneNested(v, depth - 1)])
  );
}

function newCharacter(name) {
  const boneOffsets   = Object.fromEntries(Object.entries(DEFAULT_BUILD_BONE_OFFSETS).map(([k, v]) => [k, { ...v }]));
  const skinOverrides = cloneSkinOverrides(DEFAULT_BUILD_SKIN_OVERRIDES);
  return {
    id: genId(),
    name,
    parts: {
      ...DEFAULT_CHARACTER,
      customColors:  { ...DEFAULT_BUILD_COLORS },
      weaponOffset:  { x: 0, y: 0, rotation: 0 },
      weaponOffsets:     cloneNested(DEFAULT_WEAPON_OFFSETS,      1),
      weaponAnimOffsets: cloneNested(DEFAULT_WEAPON_ANIM_OFFSETS, 2),
      weaponScales:      { ...DEFAULT_WEAPON_SCALES },
    },
    boneOffsets,
    skinOverrides,
    defaultBoneOffsets:    Object.fromEntries(Object.entries(DEFAULT_BUILD_BONE_OFFSETS).map(([k, v]) => [k, { ...v }])),
    defaultSkinOverrides:  cloneSkinOverrides(DEFAULT_BUILD_SKIN_OVERRIDES),
    animBoneOffsets:       cloneNested(DEFAULT_ANIM_BONE_OFFSETS,       2),
    animKeyframeOverrides: cloneNested(DEFAULT_ANIM_KEYFRAME_OVERRIDES, 3),
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
  const [editAnimPose, setEditAnimPose] = useState(false);
  const [showBones,    setShowBones]    = useState(false);
  const [showVectors,  setShowVectors]  = useState(false);
  const [ragdoll,       setRagdoll]       = useState(false);
  const [editStructure, setEditStructure] = useState(false);
  const [rebindMode,    setRebindMode]    = useState(false);
  const [showBinds,     setShowBinds]     = useState(false);
  const [selectedSkin,  setSelectedSkin]  = useState('all');

  const charCanvasRef = useRef(null);

  // Weapon PNG upload dialog
  const [weaponUploadOpen, setWeaponUploadOpen] = useState(false);

  // ── Animation keyframe editing ───────────────────────────────────────────────
  // When set, the canvas pauses + seeks to this time. Drags on the named bone
  // write back to character.animKeyframeOverrides[currentAnimation][bone][time].
  const [activeKeyframe, setActiveKeyframe] = useState(null); // { boneId, time } | null

  // ── Pose editor ───────────────────────────────────────────────────────────────
  const [poseEditorOpen,  setPoseEditorOpen]  = useState(false);
  const [poseFrames,      setPoseFrames]      = useState([]);
  const [activePoseFrame, setActivePoseFrame] = useState(0);
  const [poseAnimName,    setPoseAnimName]    = useState('My Animation');
  const [poseAnimLoop,    setPoseAnimLoop]    = useState(true);
  // Tracks the live ragdoll overlay inside CharacterCanvas so we can commit it on frame switch
  const poseOverlayRef = useRef({});

  // Space = play/pause (when not typing in an input)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    setEditAnimPose(false);
  }, []);

  const duplicateCharacter = useCallback((id) => {
    setCharacters(prev => {
      const src = prev.find(c => c.id === id);
      if (!src) return prev;
      const copy = {
        ...src,
        id:   genId(),
        name: `${src.name} copy`,
        parts:                { ...src.parts, customColors: { ...(src.parts.customColors ?? {}) }, partScales: { ...(src.parts.partScales ?? {}) }, weaponOffset: { ...(src.parts.weaponOffset ?? { x: 0, y: 0, rotation: 0 }) }, weaponOffsets: Object.fromEntries(Object.entries(src.parts.weaponOffsets ?? {}).map(([k, v]) => [k, { ...v }])), weaponAnimOffsets: Object.fromEntries(Object.entries(src.parts.weaponAnimOffsets ?? {}).map(([w, m]) => [w, Object.fromEntries(Object.entries(m).map(([a, v]) => [a, { ...v }]))])), weaponScales: { ...(src.parts.weaponScales ?? {}) }, weaponImages: { ...(src.parts.weaponImages ?? {}) } },
        boneOffsets:          { ...src.boneOffsets },
        skinOverrides:        Object.fromEntries(Object.entries(src.skinOverrides).map(([k, pts]) => [k, pts.map(p => [...p])])),
        defaultBoneOffsets:   { ...src.defaultBoneOffsets },
        defaultSkinOverrides: Object.fromEntries(Object.entries(src.defaultSkinOverrides).map(([k, pts]) => [k, pts.map(p => [...p])])),
        customAnimations:     (src.customAnimations ?? []).map(a => ({ ...a, tracks: Object.fromEntries(Object.entries(a.tracks).map(([k, kfs]) => [k, kfs.map(kf => ({ ...kf }))])) })),
        animBoneOffsets:      Object.fromEntries(Object.entries(src.animBoneOffsets ?? {}).map(([anim, boneMap]) => [anim, Object.fromEntries(Object.entries(boneMap).map(([b, v]) => [b, { ...v }]))])),
        animKeyframeOverrides:Object.fromEntries(Object.entries(src.animKeyframeOverrides ?? {}).map(([anim, boneMap]) => [anim, Object.fromEntries(Object.entries(boneMap).map(([b, timeMap]) => [b, Object.fromEntries(Object.entries(timeMap).map(([t, v]) => [t, { ...v }]))]))])),
      };
      setActiveCharId(copy.id);
      return [...prev, copy];
    });
  }, []);

  // ── Active character mutations (called from CharacterCanvas) ──────────────────
  const updatePart = useCallback((partKey, optionKey) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const customColors = { ...(c.parts.customColors ?? {}) };
      delete customColors[partKey];
      return { ...c, parts: { ...c.parts, [partKey]: optionKey, customColors } };
    }));
    if (partKey === 'weapon') {
      setCurrentAnimation(WEAPON_DEFAULT_ANIMATIONS[optionKey] ?? 'idle');
      setIsPlaying(true);
    }
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

  const updateBodyImage = useCallback((dataUrl) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const parts = { ...c.parts };
      if (dataUrl) parts.bodyImage = dataUrl;
      else         delete parts.bodyImage;
      return { ...c, parts };
    }));
  }, [activeCharId]);

  const updateHeadImage = useCallback((dataUrl) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const parts = { ...c.parts };
      if (dataUrl) parts.headImage = dataUrl;
      else         delete parts.headImage;
      return { ...c, parts };
    }));
  }, [activeCharId]);

  const updateWeaponImage = useCallback((dataUrl) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const weapon = c.parts.weapon;
      if (!weapon || weapon === 'none') return c;
      const images = { ...(c.parts.weaponImages ?? {}) };
      if (dataUrl) images[weapon] = dataUrl;
      else         delete images[weapon];
      return { ...c, parts: { ...c.parts, weaponImages: images } };
    }));
  }, [activeCharId]);

  const updateBoneOffsets = useCallback((newOffsets) => {
    setCharacters(prev => prev.map(c =>
      c.id === activeCharId ? { ...c, boneOffsets: newOffsets } : c
    ));
  }, [activeCharId]);

  // Offsets are stored per-(weapon × animation). Falls back through:
  //   parts.weaponAnimOffsets[weapon][anim]
  //   parts.weaponOffsets[weapon]
  //   parts.weaponOffset
  //   { x:0, y:0, rotation:0 }
  const updateWeaponOffset = useCallback((axis, delta) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const weapon = c.parts.weapon;
      if (!weapon || weapon === 'none') return c;
      const anim = currentAnimation;
      const animOffsets = { ...(c.parts.weaponAnimOffsets ?? {}) };
      const weaponMap   = { ...(animOffsets[weapon] ?? {}) };
      const cur = weaponMap[anim]
              ?? c.parts.weaponOffsets?.[weapon]
              ?? c.parts.weaponOffset
              ?? { x: 0, y: 0, rotation: 0 };
      weaponMap[anim] = { ...cur, [axis]: (cur[axis] || 0) + delta };
      animOffsets[weapon] = weaponMap;
      return { ...c, parts: { ...c.parts, weaponAnimOffsets: animOffsets } };
    }));
  }, [activeCharId, currentAnimation]);

  const resetWeaponOffset = useCallback(() => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const weapon = c.parts.weapon;
      if (!weapon || weapon === 'none') return c;
      const anim = currentAnimation;
      const animOffsets = { ...(c.parts.weaponAnimOffsets ?? {}) };
      const weaponMap   = { ...(animOffsets[weapon] ?? {}) };
      // Delete the per-animation entry so the weapon default takes over again.
      delete weaponMap[anim];
      if (Object.keys(weaponMap).length === 0) delete animOffsets[weapon];
      else                                      animOffsets[weapon] = weaponMap;
      return { ...c, parts: { ...c.parts, weaponAnimOffsets: animOffsets } };
    }));
  }, [activeCharId, currentAnimation]);

  const updateWeaponScale = useCallback((newScale) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const weapon = c.parts.weapon;
      if (!weapon || weapon === 'none') return c;
      const scales = { ...(c.parts.weaponScales ?? {}) };
      if (Math.abs(newScale - 1) < 0.001) delete scales[weapon];
      else                                 scales[weapon] = newScale;
      return { ...c, parts: { ...c.parts, weaponScales: scales } };
    }));
  }, [activeCharId]);

  const updateAnimBoneOffsets = useCallback((newAnimBoneOffsets) => {
    setCharacters(prev => prev.map(c =>
      c.id === activeCharId ? { ...c, animBoneOffsets: newAnimBoneOffsets } : c
    ));
  }, [activeCharId]);

  const resetAnimPose = useCallback((animKey) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const { [animKey]: _, ...rest } = c.animBoneOffsets ?? {};
      return { ...c, animBoneOffsets: rest };
    }));
    charCanvasRef.current?.resetAnimBoneOffsets(animKey);
  }, [activeCharId]);

  // Per-keyframe override: replace a specific (anim, bone, time) keyframe's
  // values. Values: { rotation?, x?, y? } merged into the existing override.
  const updateAnimKeyframeOverride = useCallback((animId, boneId, time, values) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const ov     = { ...(c.animKeyframeOverrides ?? {}) };
      const animOv = { ...(ov[animId] ?? {}) };
      const boneOv = { ...(animOv[boneId] ?? {}) };
      const key    = Number(time).toFixed(2);
      boneOv[key]  = { ...(boneOv[key] ?? {}), ...values };
      animOv[boneId] = boneOv;
      ov[animId]     = animOv;
      return { ...c, animKeyframeOverrides: ov };
    }));
  }, [activeCharId]);

  // Click on a keyframe row in the curve panel: pause + seek + remember which
  // keyframe is "active" so ragdoll drags route to it.
  const onKeyframeClick = useCallback((boneId, time) => {
    setIsPlaying(false);
    setActiveKeyframe({ boneId, time });
    charCanvasRef.current?.seekTime?.(time);
  }, []);

  // Switching animation tabs or leaving Edit Pose mode clears the active keyframe.
  useEffect(() => { setActiveKeyframe(null); }, [currentAnimation]);
  useEffect(() => { if (!editAnimPose) setActiveKeyframe(null); }, [editAnimPose]);

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
    if (animKey === 'jump')        { setCurrentAnimation('idle');       return; }
    if (animKey === 'sword_jump')  { setCurrentAnimation('sword_idle'); return; }
    if (animKey === 'rifle_jump')  { setCurrentAnimation('rifle_idle'); return; }
    if (animKey === 'sword_slash') { setCurrentAnimation('sword_idle'); return; }
    if (!ANIMATIONS[animKey]) { setCurrentAnimation('idle'); }
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
    setEditAnimPose(false);
    setIsPlaying(true);
    if (key !== 'edit') {
      setShowVectors(false);
      setRagdoll(false);
      setEditStructure(false);
    }
  }, [activeCharId]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Slim single-line header */}
      <header className="px-4 py-2 border-b border-border bg-card flex items-center gap-2 shrink-0">
        <h1 className="text-sm font-semibold text-foreground">2D Character Generator</h1>
        <span className="text-muted-foreground/30 select-none">·</span>
        <span className="text-xs text-muted-foreground">Skeletal animation · Modular parts · Export ready</span>
        <div className="ml-auto">
          <ExportMenu
            onSpriteSheet={() => exportSpriteSheet(activeChar.parts, currentAnimation, activeChar.boneOffsets, activeChar.skinOverrides)}
            onAnimationJSON={() => exportAnimationJSON(currentAnimation)}
          />
        </div>
      </header>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Three-panel row */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <CharacterBuilder
            character={activeChar.parts}
            characters={characters}
            activeCharId={activeCharId}
            onPartChange={updatePart}
            onColorChange={updateColor}
            onScaleChange={updatePartScale}
            onBodyImageChange={updateBodyImage}
            onHeadImageChange={updateHeadImage}
            onAddCharacter={addCharacter}
            onDeleteCharacter={deleteCharacter}
            onRenameCharacter={renameCharacter}
            onSelectCharacter={selectCharacter}
            onDuplicateCharacter={duplicateCharacter}
          />

          <main className="flex-1 flex items-center justify-center p-6 overflow-auto relative">
              <button
                onClick={() => handleAnimationChange(currentAnimation === 'edit' ? 'idle' : 'edit')}
                className={cn(
                  'absolute top-4 right-4 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors z-10',
                  currentAnimation === 'edit'
                    ? 'bg-yellow-400 border-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]'
                    : 'bg-secondary border-border text-muted-foreground hover:border-yellow-400/60 hover:text-yellow-400',
                )}
              >
                Edit
              </button>
            <div className="flex flex-col items-start">
              {currentAnimation === 'edit' && (
                <div className="bg-yellow-400 text-black text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-t-md select-none pointer-events-none shadow-[0_0_14px_rgba(250,204,21,0.7)]">
                  Edit Mode
                </div>
              )}
              {editAnimPose && currentAnimation !== 'edit' && (
                <div className="bg-teal-400 text-black text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-t-md select-none pointer-events-none shadow-[0_0_14px_rgba(45,212,191,0.7)]">
                  Pose Edit — {(ANIMATIONS[currentAnimation] ?? activeChar.customAnimations?.find(a => a.id === currentAnimation))?.name ?? currentAnimation}
                </div>
              )}
              <div className={cn(
                  'rounded-lg border overflow-hidden shadow-2xl transition-colors duration-200',
                  currentAnimation === 'edit'
                    ? 'border-yellow-400 shadow-[0_0_24px_rgba(250,204,21,0.25)] rounded-tl-none'
                    : editAnimPose
                    ? 'border-teal-400 shadow-[0_0_24px_rgba(45,212,191,0.2)] rounded-tl-none'
                    : 'border-border',
                )}>
              <CharacterCanvas
                ref={charCanvasRef}
                key={poseEditorOpen ? `pose-${activePoseFrame}` : activeCharId}
                character={activeChar.parts}
                boneOffsets={poseEditorOpen ? (poseFrames[activePoseFrame]?.boneOffsets ?? {}) : activeChar.boneOffsets}
                skinOverrides={activeChar.skinOverrides}
                defaultBoneOffsets={activeChar.defaultBoneOffsets}
                defaultSkinOverrides={activeChar.defaultSkinOverrides}
                animBoneOffsets={poseEditorOpen ? {} : (activeChar.animBoneOffsets ?? {})}
                animKeyframeOverrides={poseEditorOpen ? {} : (activeChar.animKeyframeOverrides ?? {})}
                activeKeyframe={activeKeyframe}
                onKeyframeOverrideChange={updateAnimKeyframeOverride}
                currentAnimation={currentAnimation}
                isPlaying={isPlaying}
                showBones={showBones}
                showVectors={poseEditorOpen ? false : showVectors}
                ragdoll={poseEditorOpen ? true : ragdoll}
                editStructure={poseEditorOpen ? false : editStructure}
                rebindMode={poseEditorOpen ? false : rebindMode}
                showBinds={poseEditorOpen ? false : showBinds}
                selectedSkin={selectedSkin}
                editAnimPose={poseEditorOpen ? false : editAnimPose}
                customAnimations={activeChar.customAnimations}
                onAnimationComplete={handleAnimationComplete}
                onBoneOffsetsChange={poseEditorOpen ? updatePoseFrameBones : updateBoneOffsets}
                onSkinOverridesChange={updateSkinOverrides}
                onRagdollOverlayChange={poseEditorOpen ? handlePoseRagdollOverlayChange : undefined}
                onAnimBoneOffsetsChange={poseEditorOpen ? undefined : updateAnimBoneOffsets}
                onSaveDefault={saveCharacterDefault}
              />
            </div>
            </div>
          </main>

          <aside className="w-80 shrink-0 bg-card border-l border-border overflow-y-auto p-4 flex flex-col gap-4">
            {/* Weapon */}
            <div className="flex flex-col gap-2">
              {(() => {
                const w = activeChar.parts.weapon;
                const curScale = activeChar.parts.weaponScales?.[w]
                              ?? activeChar.parts.partScales?.weapon
                              ?? 1;
                return (
                  <div className="flex items-center justify-between">
                    <SectionTitle>Weapon</SectionTitle>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => updateWeaponScale(Math.max(0.5, +((curScale - 0.1).toFixed(2))))}
                        disabled={curScale <= 0.5 || w === 'none'}
                        className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                      >−</button>
                      <span className={cn('text-[11px] min-w-[32px] text-center font-mono', Math.abs(curScale - 1) < 0.001 ? 'text-muted-foreground' : 'text-primary')}>
                        {Math.round(curScale * 100)}%
                      </span>
                      <button
                        onClick={() => updateWeaponScale(Math.min(3.0, +((curScale + 0.1).toFixed(2))))}
                        disabled={curScale >= 3.0 || w === 'none'}
                        className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                      >+</button>
                    </div>
                  </div>
                );
              })()}
              <div className="flex flex-wrap gap-1">
                {Object.entries(CHARACTER_PARTS.weapon.options).map(([key, opt]) => (
                  <button
                    key={key}
                    onClick={() => updatePart('weapon', key)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs whitespace-nowrap border transition-colors',
                      activeChar.parts.weapon === key
                        ? 'bg-primary border-primary text-primary-foreground font-semibold'
                        : 'bg-secondary border-border text-foreground hover:border-primary',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* User-uploaded PNG that replaces the procedural weapon drawing.
                  Stored per-weapon at parts.weaponImages[currentWeapon] so
                  swapping Sword ↔ Rifle keeps each one's image. */}
              {activeChar.parts.weapon !== 'none' && (() => {
                const currentWeaponImage = activeChar.parts.weaponImages?.[activeChar.parts.weapon];
                return (
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <button
                      onClick={() => setWeaponUploadOpen(true)}
                      title={currentWeaponImage ? `Replace ${activeChar.parts.weapon} PNG` : `Upload a PNG to skin the ${activeChar.parts.weapon}`}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ImageUp className="h-3.5 w-3.5" />
                      <span>{currentWeaponImage ? 'Replace PNG' : 'Upload PNG'}</span>
                    </button>
                    {currentWeaponImage && (
                      <button
                        onClick={() => updateWeaponImage(null)}
                        title={`Remove ${activeChar.parts.weapon} image (revert to procedural)`}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Weapon anchor offset controls — only shown when a weapon is equipped */}
              {activeChar.parts.weapon !== 'none' && (() => {
                const wo = activeChar.parts.weaponAnimOffsets?.[activeChar.parts.weapon]?.[currentAnimation]
                        ?? activeChar.parts.weaponOffsets?.[activeChar.parts.weapon]
                        ?? activeChar.parts.weaponOffset
                        ?? { x: 0, y: 0, rotation: 0 };
                const isDirty = wo.x !== 0 || wo.y !== 0 || wo.rotation !== 0;
                const btnCls = 'w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 transition-colors';
                const valCls = 'font-mono text-[11px] min-w-[30px] text-center';
                const STEP_PX  = 2;
                const STEP_DEG = 5 * Math.PI / 180;
                return (
                  <div className="flex flex-col gap-1 mt-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* X offset */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground w-4">X</span>
                        <button className={btnCls} onClick={() => updateWeaponOffset('x', -STEP_PX)}>−</button>
                        <span className={cn(valCls, wo.x ? 'text-primary' : 'text-muted-foreground')}>{Math.round(wo.x ?? 0)}</span>
                        <button className={btnCls} onClick={() => updateWeaponOffset('x',  STEP_PX)}>+</button>
                      </div>
                      {/* Y offset */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground w-4">Y</span>
                        <button className={btnCls} onClick={() => updateWeaponOffset('y', -STEP_PX)}>−</button>
                        <span className={cn(valCls, wo.y ? 'text-primary' : 'text-muted-foreground')}>{Math.round(wo.y ?? 0)}</span>
                        <button className={btnCls} onClick={() => updateWeaponOffset('y',  STEP_PX)}>+</button>
                      </div>
                      {/* Rotation */}
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground w-4">°</span>
                        <button className={btnCls} onClick={() => updateWeaponOffset('rotation', -STEP_DEG)}>−</button>
                        <span className={cn(valCls, wo.rotation ? 'text-primary' : 'text-muted-foreground')}>
                          {Math.round((wo.rotation ?? 0) * 180 / Math.PI)}°
                        </span>
                        <button className={btnCls} onClick={() => updateWeaponOffset('rotation',  STEP_DEG)}>+</button>
                      </div>
                      {isDirty && (
                        <button
                          onClick={resetWeaponOffset}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-auto"
                          title="Reset weapon offset"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <Separator />

            <AnimationControls
              currentAnimation={currentAnimation}
              isPlaying={isPlaying}
              weapon={activeChar.parts.weapon}
              showBones={showBones}
              showVectors={showVectors}
              ragdoll={ragdoll}
              editStructure={editStructure}
              rebindMode={rebindMode}
              showBinds={showBinds}
              selectedSkin={selectedSkin}
              editAnimPose={editAnimPose}
              hasAnimPoseEdits={Object.keys((activeChar.animBoneOffsets ?? {})[currentAnimation] ?? {}).length > 0}
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
              onEditAnimPoseToggle={() => {
                setEditAnimPose(p => {
                  // Enter pose-edit → pause so the user has a stable target to drag.
                  // Exit pose-edit → resume so they can see the edited animation play.
                  setIsPlaying(p ? true : false);
                  return !p;
                });
              }}
              onResetAnimPose={() => resetAnimPose(currentAnimation)}
            />

            {editAnimPose && !poseEditorOpen && (
              <>
                <Separator />
                <AnimationCurvePanel
                  animation={resolveAnimation(
                    ANIMATIONS[currentAnimation]
                    ?? activeChar.customAnimations?.find(a => a.id === currentAnimation),
                    (activeChar.animKeyframeOverrides ?? {})[currentAnimation] ?? {},
                  )}
                  offsets={(activeChar.animBoneOffsets ?? {})[currentAnimation] ?? {}}
                  overrides={(activeChar.animKeyframeOverrides ?? {})[currentAnimation] ?? {}}
                  activeKeyframe={activeKeyframe}
                  onKeyframeClick={onKeyframeClick}
                />
              </>
            )}
          </aside>
        </div>

        {/* Pose editor — full-width bottom panel, canvas stays full size */}
        {poseEditorOpen && (
          <div className="shrink-0 border-t border-border bg-card">
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
          </div>
        )}
      </div>

      <WeaponUploadDialog
        open={weaponUploadOpen}
        weaponType={activeChar.parts.weapon}
        currentImage={activeChar.parts.weaponImages?.[activeChar.parts.weapon]}
        onPick={updateWeaponImage}
        onClose={() => setWeaponUploadOpen(false)}
      />
    </div>
  );
}
