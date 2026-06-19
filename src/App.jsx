import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { CharacterCanvas } from './components/CharacterCanvas.jsx';
import { CharacterBuilder } from './components/CharacterBuilder.jsx';
import { AnimationControls } from './components/AnimationControls.jsx';
import { EditBodyControls } from './components/EditBodyControls.jsx';
import { PoseEditor } from './components/PoseEditor.jsx';
import { ExportMenu } from './components/ExportMenu.jsx';
import { SpritePreviewDialog } from './components/SpritePreviewDialog.jsx';
import { SpriteExportDialog } from './components/SpriteExportDialog.jsx';
import { WorkspaceMenu } from './components/WorkspaceMenu.jsx';
import { AnimationCurvePanel } from './components/AnimationCurvePanel.jsx';
import { WeaponUploadDialog } from './components/WeaponUploadDialog.jsx';
import { AccessoryUploadDialog } from './components/AccessoryUploadDialog.jsx';
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
import { ANIMATIONS, WEAPON_DEFAULT_ANIMATIONS, resolveAnimation, getPoseAtTime } from './systems/AnimationSystem.js';
import { exportSpriteSheet, exportAnimationJSON, exportPoseSVG, exportPartsSheetSVG } from './utils/export.js';
import { framesToAnimation } from './utils/poseToAnimation.js';
import { mergeOffsets } from './utils/transforms.js';
import { resolveWeaponOffset, resolveAccessoryOffset, resolveAccessoryScale, resolveBodyAccessoryOffset, resolveBodyAccessoryScale } from './utils/weaponSettings.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SectionTitle } from '@/components/ui/section-title';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Frame, ImageUp, Pause, Pencil, Play, X } from 'lucide-react';
import { genId } from './utils/genId.js';
import { NewAnimationDialog } from './components/NewAnimationDialog.jsx';
import { NewWeaponDialog } from './components/NewWeaponDialog.jsx';
import { SaveTemplateDialog } from './components/SaveTemplateDialog.jsx';

const CHARS_STORAGE     = '2dsprite:characters';
const TEMPLATES_STORAGE = '2dsprite:templates';

// Bake keyframe overrides + time-invariant pose offsets into animation tracks.
// Returns a new animation object with merged tracks; does not mutate inputs.
function bakeAnimation(baseAnim, overrides, animOffsets) {
  let resolved = resolveAnimation(baseAnim, overrides);
  if (Object.keys(animOffsets).length > 0) {
    const tracks = { ...resolved.tracks };
    for (const [boneId, offset] of Object.entries(animOffsets)) {
      const ox = offset.x ?? 0, oy = offset.y ?? 0, or_ = offset.rotation ?? 0;
      if (!ox && !oy && !or_) continue;
      if (tracks[boneId]) {
        tracks[boneId] = tracks[boneId].map(kf => ({
          ...kf,
          ...(ox  !== 0 ? { x:        (kf.x        ?? 0) + ox  } : {}),
          ...(oy  !== 0 ? { y:        (kf.y        ?? 0) + oy  } : {}),
          ...(or_ !== 0 ? { rotation: (kf.rotation ?? 0) + or_ } : {}),
        }));
      } else {
        tracks[boneId] = [
          { time: 0,                 x: ox, y: oy, rotation: or_ },
          { time: resolved.duration, x: ox, y: oy, rotation: or_ },
        ];
      }
    }
    resolved = { ...resolved, tracks };
  }
  return resolved;
}

// Stable empty object — avoids creating a new reference on every render when
// a prop value is conditionally absent (e.g. animBoneOffsets when poseEditorOpen).
const EMPTY_OBJ = {};

// Weapon scale clamps (matched by the −/+ buttons and the input).
const MIN_WEAPON_SCALE = 0.1;
const MAX_WEAPON_SCALE = 3.0;
const WEAPON_SCALE_STEP = 0.1;
const MIN_ACCESSORY_SCALE = 0.1;
const MAX_ACCESSORY_SCALE = 3.0;
const ACCESSORY_SCALE_STEP = 0.1;

// When a one-shot animation finishes, where to land. Looping animations never
// trigger onAnimationComplete, so entries for loop:true animations are harmless
// (they sit dormant unless someone flips the animation back to one-shot).
const ANIMATION_COMPLETE_TARGETS = {
  jump:                       'idle',
  sword_jump:                 'sword_idle',
  sword_slash:                'sword_idle',
  rifle_jump:                 'rifle_idle',
  rocket_jump:                'rocket_idle',
  rocket_fire:                'rocket_idle',
  pistol_jump:                'pistol_idle',
};

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
      accessoryOffset: { x: 0, y: 0, rotation: 0 },
    },
    boneOffsets,
    skinOverrides,
    defaultBoneOffsets:    Object.fromEntries(Object.entries(DEFAULT_BUILD_BONE_OFFSETS).map(([k, v]) => [k, { ...v }])),
    defaultSkinOverrides:  cloneSkinOverrides(DEFAULT_BUILD_SKIN_OVERRIDES),
    animBoneOffsets:       cloneNested(DEFAULT_ANIM_BONE_OFFSETS,       2),
    animKeyframeOverrides: cloneNested(DEFAULT_ANIM_KEYFRAME_OVERRIDES, 3),
    customWeapons:         [],
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

// Spreads the character's arms into a horizontal T-pose so joints are easy
// to grab in Edit Body mode. Weapon is cleared (no grip pose to maintain).
function withTPose(char) {
  const off = char.boneOffsets ?? {};
  const lfx = 0  + (off.left_forearm?.x  ?? 0);
  const lfy = 40 + (off.left_forearm?.y  ?? 0);
  const rfx = 0  + (off.right_forearm?.x ?? 0);
  const rfy = 40 + (off.right_forearm?.y ?? 0);
  const lhx = 0  + (off.left_hand?.x     ?? 0);
  const lhy = 40 + (off.left_hand?.y     ?? 0);
  const rhx = 0  + (off.right_hand?.x    ?? 0);
  const rhy = 40 + (off.right_hand?.y    ?? 0);
  // World rotations so each segment lies along the horizontal axis.
  // Left arm extends toward −X (world angle π); right arm toward +X.
  const leftArmWorld   = Math.PI - Math.atan2(lfy, lfx);
  const rightArmWorld  =          -Math.atan2(rfy, rfx);
  const leftFArmWorld  = Math.PI - Math.atan2(lhy, lhx);
  const rightFArmWorld =          -Math.atan2(rhy, rhx);
  return {
    ...char,
    parts: { ...char.parts, weapon: 'none' },
    boneOffsets: {
      ...off,
      left_arm:      { ...(off.left_arm      ?? {}), rotation: leftArmWorld  },
      right_arm:     { ...(off.right_arm     ?? {}), rotation: rightArmWorld },
      left_forearm:  { ...(off.left_forearm  ?? {}), rotation: leftFArmWorld  - leftArmWorld  },
      right_forearm: { ...(off.right_forearm ?? {}), rotation: rightFArmWorld - rightArmWorld },
      left_hand:     { ...(off.left_hand     ?? {}), rotation: 0 },
      right_hand:    { ...(off.right_hand    ?? {}), rotation: 0 },
    },
  };
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
  const [showFrame,    setShowFrame]    = useState(false);
  const [headerTab,    setHeaderTab]    = useState('');
  const [showVectors,  setShowVectors]  = useState(false);
  const [ragdoll,       setRagdoll]       = useState(false);
  const [editStructure, setEditStructure] = useState(false);
  const [rebindMode,    setRebindMode]    = useState(false);
  const [showBinds,     setShowBinds]     = useState(false);
  const [selectedSkin,  setSelectedSkin]  = useState('all');

  const charCanvasRef = useRef(null);
  const headerMenuRef = useRef(null);
  // Records which header tab was open at pointer-down, before Radix's
  // onValueChange (which fires on press) mutates headerTab. The trigger's
  // onClick (which fires on release) uses this to decide whether the click
  // was a re-click on the already-open tab — only then should it close.
  const headerTabDownRef = useRef('');

  // Weapon PNG upload dialog
  const [weaponUploadOpen,    setWeaponUploadOpen]    = useState(false);
  const [accessoryUploadOpen, setAccessoryUploadOpen] = useState(false);
  const [bodyAccessoryUploadOpen, setBodyAccessoryUploadOpen] = useState(false);

  // Sprite sheet preview dialog. spritePreview = { character, animationName } | null.
  // Captured at open time so changes to active selection don't disturb the open dialog.
  const [spritePreview, setSpritePreview] = useState(null);

  // Sprite sheet export dialog. Same capture-at-open shape.
  const [spriteExport,  setSpriteExport]  = useState(null);

  // ── Animation keyframe editing ───────────────────────────────────────────────
  // When set, the canvas pauses + seeks to this time. Drags on the named bone
  // write back to character.animKeyframeOverrides[currentAnimation][bone][time].
  const [activeKeyframe, setActiveKeyframe] = useState(null); // { boneId, time } | null
  // Onion-skinning: faint ghost of the pose just before/after the playhead,
  // shown while paused in Edit Animation so the user can judge spacing.
  const [onionSkin, setOnionSkin] = useState(false);

  // ── Animation templates (global, persisted to localStorage) ──────────────────
  const [animTemplates, setAnimTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TEMPLATES_STORAGE) ?? '[]'); }
    catch { return []; }
  });
  useEffect(() => {
    localStorage.setItem(TEMPLATES_STORAGE, JSON.stringify(animTemplates));
  }, [animTemplates]);
  const [newAnimDialogOpen,    setNewAnimDialogOpen]    = useState(false);
  const [saveTemplateDialog,   setSaveTemplateDialog]   = useState(null); // { defaultName, resolved } | null

  const [weaponDialog, setWeaponDialog] = useState(null); // { mode:'create'|'rename', key?, defaultName? }

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
      if (next) {
        setRagdoll(false);
        setShowBones(true);
      }
      return next;
    });
  }, []);

  const activeChar = characters.find(c => c.id === activeCharId) ?? characters[0];

  const handlePreviewSpriteSheet = useCallback(() => {
    setSpritePreview({ character: activeChar, animationName: currentAnimation });
  }, [activeChar, currentAnimation]);

  // Close header menu on outside click or Escape
  useEffect(() => {
    if (!headerTab) return;
    const onDown = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setHeaderTab('');
    };
    const onKey = (e) => { if (e.key === 'Escape') setHeaderTab(''); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [headerTab]);

  // Debounced persist on every characters change
  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistCharacters(characters), 600);
    return () => clearTimeout(saveTimer.current);
  }, [characters]);

  // On mount: load from file — file wins over localStorage. If the user loads
  // a workspace JSON before this fetch resolves, the in-flight response is
  // dropped (otherwise the server's stale characters.json would clobber the
  // freshly-loaded workspace data — same char IDs after a prior sync, so you'd
  // silently see old joint positions).
  const workspaceLoadedRef = useRef(false);
  useEffect(() => {
    fetch('/api/characters')
      .then(r => r.json())
      .then(data => {
        if (workspaceLoadedRef.current) return;
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
        parts: {
          ...src.parts,
          customColors:      { ...(src.parts.customColors      ?? {}) },
          partScales:        { ...(src.parts.partScales        ?? {}) },
          weaponOffset:      { ...(src.parts.weaponOffset      ?? { x: 0, y: 0, rotation: 0 }) },
          weaponOffsets:     cloneNested(src.parts.weaponOffsets     ?? {}, 1),
          weaponAnimOffsets: cloneNested(src.parts.weaponAnimOffsets ?? {}, 2),
          weaponScales:      { ...(src.parts.weaponScales      ?? {}) },
          weaponImages:      { ...(src.parts.weaponImages      ?? {}) },
          accessoryOffset:      { ...(src.parts.accessoryOffset      ?? { x: 0, y: 0, rotation: 0 }) },
          accessoryAnimOffsets: cloneNested(src.parts.accessoryAnimOffsets ?? {}, 1),
          accessoryImages:      { ...(src.parts.accessoryImages ?? {}) },
          accessoryScales:     { ...(src.parts.accessoryScales ?? {}) },
          ...(src.parts.bodyAccessoryImage ? { bodyAccessoryImage: src.parts.bodyAccessoryImage } : {}),
          ...(src.parts.bodyAccessoryScale != null ? { bodyAccessoryScale: src.parts.bodyAccessoryScale } : {}),
          bodyAccessoryOffset:      { ...(src.parts.bodyAccessoryOffset ?? { x: 0, y: 0, rotation: 0 }) },
          bodyAccessoryAnimOffsets: cloneNested(src.parts.bodyAccessoryAnimOffsets ?? {}, 1),
        },
        boneOffsets:          { ...src.boneOffsets },
        skinOverrides:        cloneSkinOverrides(src.skinOverrides),
        defaultBoneOffsets:   { ...src.defaultBoneOffsets },
        defaultSkinOverrides: cloneSkinOverrides(src.defaultSkinOverrides),
        // Custom animations are per-character and not carried over on duplication.
        animBoneOffsets:       cloneNested(src.animBoneOffsets       ?? {}, 2),
        animKeyframeOverrides: cloneNested(src.animKeyframeOverrides ?? {}, 3),
        customWeapons:         (src.customWeapons ?? []).map(w => ({ ...w })),
      };
      setActiveCharId(copy.id);
      setCurrentAnimation('idle');
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
      const animTemplate = (activeChar.customWeapons ?? []).find(w => w.key === optionKey)?.template ?? optionKey;
      setCurrentAnimation(WEAPON_DEFAULT_ANIMATIONS[animTemplate] ?? 'idle');
      setIsPlaying(true);
    }
  }, [activeCharId, activeChar.customWeapons]);

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

  const updateNeckLength = useCallback((len) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const parts = { ...c.parts };
      if (Math.abs(len - 72) < 0.5) delete parts.neckLength;
      else parts.neckLength = len;
      return { ...c, parts };
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

  const updateAccessoryImage = useCallback((dataUrl) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const weapon = c.parts.weapon;
      const images = { ...(c.parts.accessoryImages ?? {}) };
      if (dataUrl) images[weapon] = dataUrl;
      else         delete images[weapon];
      return { ...c, parts: { ...c.parts, accessoryImages: images } };
    }));
  }, [activeCharId]);

  const setAccessoryOffsetAbsolute = useCallback((newOffset) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const anim = currentAnimation;
      const animOffsets = { ...(c.parts.accessoryAnimOffsets ?? {}) };
      animOffsets[anim] = { x: newOffset.x ?? 0, y: newOffset.y ?? 0, rotation: newOffset.rotation ?? 0 };
      return { ...c, parts: { ...c.parts, accessoryAnimOffsets: animOffsets } };
    }));
  }, [activeCharId, currentAnimation]);

  const updateAccessoryScale = useCallback((newScale) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const weapon = c.parts.weapon;
      if (!weapon || weapon === 'none') return c;
      const scales = { ...(c.parts.accessoryScales ?? {}) };
      scales[weapon] = newScale;
      return { ...c, parts: { ...c.parts, accessoryScales: scales } };
    }));
  }, [activeCharId]);

  const resetAccessoryOffset = useCallback(() => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const anim = currentAnimation;
      const animOffsets = { ...(c.parts.accessoryAnimOffsets ?? {}) };
      delete animOffsets[anim];
      return { ...c, parts: { ...c.parts, accessoryAnimOffsets: animOffsets } };
    }));
  }, [activeCharId, currentAnimation]);

  // ── Body accessory (single PNG anchored to the torso, persists across weapons) ──
  const updateBodyAccessoryImage = useCallback((dataUrl) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const parts = { ...c.parts };
      if (dataUrl) parts.bodyAccessoryImage = dataUrl;
      else         delete parts.bodyAccessoryImage;
      return { ...c, parts };
    }));
  }, [activeCharId]);

  const setBodyAccessoryOffsetAbsolute = useCallback((newOffset) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const animOffsets = { ...(c.parts.bodyAccessoryAnimOffsets ?? {}) };
      animOffsets[currentAnimation] = { x: newOffset.x ?? 0, y: newOffset.y ?? 0, rotation: newOffset.rotation ?? 0 };
      return { ...c, parts: { ...c.parts, bodyAccessoryAnimOffsets: animOffsets } };
    }));
  }, [activeCharId, currentAnimation]);

  const updateBodyAccessoryScale = useCallback((newScale) => {
    setCharacters(prev => prev.map(c =>
      c.id === activeCharId ? { ...c, parts: { ...c.parts, bodyAccessoryScale: newScale } } : c
    ));
  }, [activeCharId]);

  const resetBodyAccessoryOffset = useCallback(() => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const animOffsets = { ...(c.parts.bodyAccessoryAnimOffsets ?? {}) };
      delete animOffsets[currentAnimation];
      return { ...c, parts: { ...c.parts, bodyAccessoryAnimOffsets: animOffsets } };
    }));
  }, [activeCharId, currentAnimation]);

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
      const cur = resolveWeaponOffset(c.parts, anim);
      weaponMap[anim] = { ...cur, [axis]: (cur[axis] || 0) + delta };
      animOffsets[weapon] = weaponMap;
      return { ...c, parts: { ...c.parts, weaponAnimOffsets: animOffsets } };
    }));
  }, [activeCharId, currentAnimation]);

  const setWeaponOffsetAbsolute = useCallback((newOffset) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const weapon = c.parts.weapon;
      if (!weapon || weapon === 'none') return c;
      const anim = currentAnimation;
      const animOffsets = { ...(c.parts.weaponAnimOffsets ?? {}) };
      const weaponMap   = { ...(animOffsets[weapon] ?? {}) };
      weaponMap[anim] = { x: newOffset.x ?? 0, y: newOffset.y ?? 0, rotation: newOffset.rotation ?? 0 };
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
      scales[weapon] = newScale;
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

  // Per-animation head PNG override. dataUrl=null clears the override and
  // falls back to the character's base headImage. Stored alongside the other
  // image fields under `parts` so it's threaded into CharacterCanvas with
  // the rest of the character prop.
  const updateAnimHeadImage = useCallback((animKey, dataUrl) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const parts    = { ...c.parts };
      const animImgs = { ...(parts.animHeadImages ?? {}) };
      if (dataUrl) animImgs[animKey] = dataUrl;
      else         delete animImgs[animKey];
      parts.animHeadImages = animImgs;
      return { ...c, parts };
    }));
  }, [activeCharId]);

  // Size multiplier for the head PNG shown during this animation.
  const updateAnimHeadImageScale = useCallback((animKey, scale) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const parts  = { ...c.parts };
      const scales = { ...(parts.animHeadImageScales ?? {}) };
      scales[animKey] = scale;
      parts.animHeadImageScales = scales;
      return { ...c, parts };
    }));
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

  const commitAnimKeyframeOverrides = useCallback(() => {
    const overrides   = (activeChar.animKeyframeOverrides ?? {})[currentAnimation] ?? {};
    const animOffsets = (activeChar.animBoneOffsets ?? {})[currentAnimation] ?? {};
    if (Object.keys(overrides).length === 0 && Object.keys(animOffsets).length === 0) return;
    const baseAnim = activeChar.customAnimations?.find(a => a.id === currentAnimation)
      ?? ANIMATIONS[currentAnimation];
    if (!baseAnim) return;
    const resolved = bakeAnimation(baseAnim, overrides, animOffsets);
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const ov = { ...(c.animKeyframeOverrides ?? {}) };
      delete ov[currentAnimation];
      const ao = { ...(c.animBoneOffsets ?? {}) };
      delete ao[currentAnimation];
      const bakedAnim = { ...resolved, id: currentAnimation, custom: true };
      const existing = (c.customAnimations ?? []).some(a => a.id === currentAnimation);
      const customAnimations = existing
        ? c.customAnimations.map(a => a.id === currentAnimation ? bakedAnim : a)
        : [...(c.customAnimations ?? []), bakedAnim];
      return { ...c, customAnimations, animKeyframeOverrides: ov, animBoneOffsets: ao };
    }));
    charCanvasRef.current?.resetAnimBoneOffsets(currentAnimation);
  }, [activeCharId, activeChar, currentAnimation]);

  // ── Structural keyframe edits (add / delete / retime / duration / ease) ──────
  // Bakes the current resolved animation (base + pending overrides + offsets)
  // into a per-character custom animation, then mutates its concrete tracks via
  // `mutate(anim)`. Return the mutated anim to apply, or null to abort (no-op).
  // The baked entry reuses the animation id so the custom-first lookup picks it
  // up with no new chip; pending override/offset layers are cleared.
  const TIME_EPS = 0.005;
  const bakeAndMutateTracks = useCallback((mutate) => {
    const base = activeChar.customAnimations?.find(a => a.id === currentAnimation)
      ?? ANIMATIONS[currentAnimation];
    if (!base) return;
    const overrides   = (activeChar.animKeyframeOverrides ?? {})[currentAnimation] ?? {};
    const animOffsets = (activeChar.animBoneOffsets ?? {})[currentAnimation] ?? {};
    const resolved = bakeAnimation(base, overrides, animOffsets);
    const tracks = {};
    for (const [b, kfs] of Object.entries(resolved.tracks)) tracks[b] = kfs.map(k => ({ ...k }));
    const next = mutate({ ...resolved, tracks });
    if (!next) return;
    const baked = { ...next, id: currentAnimation, custom: true };
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const ov = { ...(c.animKeyframeOverrides ?? {}) }; delete ov[currentAnimation];
      const ao = { ...(c.animBoneOffsets ?? {}) };       delete ao[currentAnimation];
      const exists = (c.customAnimations ?? []).some(a => a.id === currentAnimation);
      const customAnimations = exists
        ? c.customAnimations.map(a => a.id === currentAnimation ? baked : a)
        : [...(c.customAnimations ?? []), baked];
      return { ...c, customAnimations, animKeyframeOverrides: ov, animBoneOffsets: ao };
    }));
    charCanvasRef.current?.resetAnimBoneOffsets(currentAnimation);
  }, [activeChar, activeCharId, currentAnimation]);

  // Snapshot the current interpolated pose at `time` into explicit keyframes on
  // every animated bone, so a new column appears on the timeline to edit.
  const addKeyframeAtTime = useCallback((time) => {
    const t = +Number(time).toFixed(2);
    bakeAndMutateTracks((anim) => {
      if (t <= 0 || t >= anim.duration) return null; // don't duplicate endpoints
      const pose = getPoseAtTime(anim, t);
      let changed = false;
      for (const [boneId, kfs] of Object.entries(anim.tracks)) {
        if (kfs.some(k => Math.abs(k.time - t) < TIME_EPS)) continue;
        const kf = { time: t };
        let any = false;
        for (const p of ['x', 'y', 'rotation']) {
          if (kfs.some(k => k[p] !== undefined)) { kf[p] = +pose[boneId][p].toFixed(4); any = true; }
        }
        if (!any) continue;
        kfs.push(kf);
        kfs.sort((a, b) => a.time - b.time);
        changed = true;
      }
      return changed ? anim : null;
    });
    setActiveKeyframe({ boneId: null, time: t });
  }, [bakeAndMutateTracks]);

  const deleteKeyframeAt = useCallback((boneId, time) => {
    bakeAndMutateTracks((anim) => {
      const kfs = anim.tracks[boneId];
      if (!kfs || kfs.length <= 2) return null;          // keep a usable track
      const idx = kfs.findIndex(k => Math.abs(k.time - Number(time)) < TIME_EPS);
      if (idx < 0) return null;
      kfs.splice(idx, 1);
      return anim;
    });
  }, [bakeAndMutateTracks]);

  const retimeKeyframe = useCallback((boneId, oldTime, newTime) => {
    bakeAndMutateTracks((anim) => {
      const kfs = anim.tracks[boneId];
      if (!kfs) return null;
      const k = kfs.find(kf => Math.abs(kf.time - Number(oldTime)) < TIME_EPS);
      if (!k) return null;
      k.time = Math.max(0, Math.min(anim.duration, +Number(newTime).toFixed(2)));
      kfs.sort((a, b) => a.time - b.time);
      return anim;
    });
  }, [bakeAndMutateTracks]);

  const setKeyframeEase = useCallback((boneId, time, ease) => {
    bakeAndMutateTracks((anim) => {
      const kfs = anim.tracks[boneId];
      if (!kfs) return null;
      const k = kfs.find(kf => Math.abs(kf.time - Number(time)) < TIME_EPS);
      if (!k) return null;
      if (ease === 'auto') delete k.ease; else k.ease = ease;
      return anim;
    });
  }, [bakeAndMutateTracks]);

  const setAnimationDuration = useCallback((newDur) => {
    const d = Math.max(0.1, Math.min(10, +Number(newDur).toFixed(2)));
    bakeAndMutateTracks((anim) => {
      const old = anim.duration || 1;
      if (Math.abs(old - d) < 1e-6) return null;
      const k = d / old;
      for (const kfs of Object.values(anim.tracks)) {
        for (const kf of kfs) kf.time = +(kf.time * k).toFixed(4);
      }
      anim.duration = d;
      return anim;
    });
  }, [bakeAndMutateTracks]);

  // Direct numeric edit of one keyframe value — routes through the override
  // layer (mergeable, reversible via Commit) rather than baking.
  const setKeyframeValue = useCallback((boneId, time, prop, value) => {
    updateAnimKeyframeOverride(currentAnimation, boneId, time, { [prop]: value });
  }, [updateAnimKeyframeOverride, currentAnimation]);

  // Scrub: pause, mark this time as the active edit point, seek the canvas.
  const seekToTime = useCallback((time) => {
    setIsPlaying(false);
    setActiveKeyframe(prev => ({ boneId: prev?.boneId ?? null, time }));
    charCanvasRef.current?.seekTime?.(time);
  }, []);

  const getCurrentTime = useCallback(() => charCanvasRef.current?.getCurrentTime?.() ?? 0, []);

  // Click a joint on the canvas → select that bone's track in the curve panel
  // (at the current playhead time), which also scrolls it into view.
  const selectBone = useCallback((boneId) => {
    const t = charCanvasRef.current?.getCurrentTime?.() ?? 0;
    setActiveKeyframe({ boneId, time: +t.toFixed(2) });
  }, []);

  const saveAnimAsTemplate = useCallback(() => {
    const overrides   = (activeChar.animKeyframeOverrides ?? {})[currentAnimation] ?? {};
    const animOffsets = (activeChar.animBoneOffsets ?? {})[currentAnimation] ?? {};
    const baseAnim = activeChar.customAnimations?.find(a => a.id === currentAnimation)
      ?? ANIMATIONS[currentAnimation];
    if (!baseAnim) return;
    const resolved = bakeAnimation(baseAnim, overrides, animOffsets);
    const weaponKey   = activeChar.parts.weapon ?? 'none';
    const weaponLabel = CHARACTER_PARTS.weapon?.options?.[weaponKey]?.label ?? weaponKey;
    const defaultName = weaponKey === 'none'
      ? resolved.name
      : `${weaponLabel}-${resolved.name}`;
    setSaveTemplateDialog({ defaultName, resolved });
  }, [activeChar, currentAnimation]);

  const confirmSaveTemplate = useCallback((name) => {
    if (!saveTemplateDialog) return;
    const { resolved } = saveTemplateDialog;
    setAnimTemplates(prev => [...prev, {
      id: genId(), name, duration: resolved.duration,
      loop: resolved.loop, tracks: resolved.tracks,
    }]);
    setSaveTemplateDialog(null);
  }, [saveTemplateDialog]);

  const deleteAnimTemplate = useCallback((id) => {
    setAnimTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  const createAnimFromTemplate = useCallback((template) => {
    const newAnim = { ...template, id: genId(), name: `Copy of ${template.name}`, custom: true };
    setCharacters(prev => prev.map(c =>
      c.id === activeCharId ? { ...c, customAnimations: [...(c.customAnimations ?? []), newAnim] } : c
    ));
    setCurrentAnimation(newAnim.id);
    setNewAnimDialogOpen(false);
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

  // Rename an action chip. The chip label is always sourced from
  // `animationLabels[animId]` (override) ?? built-in/custom name, so we
  // always write the override there. For animations that also have a
  // matching custom record, we additionally update the custom's `name`
  // so any UI that reads the custom directly stays in sync. Passing an
  // empty/whitespace name clears the override and falls back to default.
  const renameAnimation = useCallback((animId, newName) => {
    const trimmed = (newName ?? '').trim();
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      const labels = { ...(c.animationLabels ?? {}) };
      if (!trimmed) delete labels[animId];
      else          labels[animId] = trimmed;

      const customs = c.customAnimations ?? [];
      const updatedCustoms = trimmed
        ? customs.map(a => a.id === animId ? { ...a, name: trimmed } : a)
        : customs;

      return { ...c, animationLabels: labels, customAnimations: updatedCustoms };
    }));
  }, [activeCharId]);

  // ── Custom weapon callbacks ──────────────────────────────────────────────────
  const addCustomWeapon = useCallback((label, template = 'none') => {
    const key = 'cw_' + genId();
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      return {
        ...c,
        parts: { ...c.parts, weapon: key },
        customWeapons: [...(c.customWeapons ?? []), { key, label, template }],
      };
    }));
    setWeaponDialog(null);
    setCurrentAnimation(WEAPON_DEFAULT_ANIMATIONS[template] ?? 'idle');
    setIsPlaying(true);
  }, [activeCharId]);

  const renameCustomWeapon = useCallback((key, label) => {
    setCharacters(prev => prev.map(c =>
      c.id !== activeCharId ? c : {
        ...c,
        customWeapons: (c.customWeapons ?? []).map(w => w.key === key ? { ...w, label } : w),
      }
    ));
    setWeaponDialog(null);
  }, [activeCharId]);

  const deleteCustomWeapon = useCallback((key) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== activeCharId) return c;
      return {
        ...c,
        customWeapons: (c.customWeapons ?? []).filter(w => w.key !== key),
        parts: c.parts.weapon === key ? { ...c.parts, weapon: 'none' } : c.parts,
      };
    }));
    setCurrentAnimation(cur => (activeChar.parts.weapon === key ? 'idle' : cur));
  }, [activeChar]);

  // ── Workspace save/load ───────────────────────────────────────────────────────
  const loadWorkspace = useCallback(({ characters: newChars, activeCharId: newActive, uiState }) => {
    if (!Array.isArray(newChars) || newChars.length === 0) return;
    workspaceLoadedRef.current = true;
    setCharacters(newChars);
    setActiveCharId(newActive ?? newChars[0].id);
    if (uiState && typeof uiState === 'object') {
      if (typeof uiState.currentAnimation === 'string') setCurrentAnimation(uiState.currentAnimation);
      if (typeof uiState.isPlaying === 'boolean')       setIsPlaying(uiState.isPlaying);
      if (typeof uiState.showBones === 'boolean')       setShowBones(uiState.showBones);
    }
    // Make sure we land in a clean, non-Edit state so the loaded character is
    // playing animations by default.
    setEditAnimPose(false);
    setRagdoll(false);
    setEditStructure(false);
    setShowVectors(false);
    setActiveKeyframe(null);
  }, []);

  // ── Animation callbacks ───────────────────────────────────────────────────────
  const handleAnimationComplete = useCallback((animKey) => {
    const next = ANIMATION_COMPLETE_TARGETS[animKey];
    if (next) { setCurrentAnimation(next); return; }
    if (!ANIMATIONS[animKey]) setCurrentAnimation('idle');
  }, []);

  const handleAnimationChange = useCallback((key) => {
    setCurrentAnimation(prev => {
      // Snap into a T-pose when first entering edit mode so limbs are spread
      // out and easier to grab. Only applied on the transition into edit.
      // Arm rotations are derived from the character's structural offsets so
      // the forearm bone ends up horizontal regardless of how the elbow is
      // positioned in the build.
      if (key === 'edit' && prev !== 'edit') {
        setCharacters(chars => chars.map(c => c.id !== activeCharId ? c : withTPose(c)));
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

  // Memoised derived values to avoid recreating objects/running resolvers every render.
  const weaponOffset = useMemo(
    () => resolveWeaponOffset(activeChar.parts, currentAnimation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeChar.parts.weaponAnimOffsets, activeChar.parts.weaponOffsets, activeChar.parts.weaponOffset, activeChar.parts.weapon, currentAnimation],
  );
  const accessoryOffset = useMemo(
    () => resolveAccessoryOffset(activeChar.parts, currentAnimation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeChar.parts.accessoryAnimOffsets, activeChar.parts.accessoryOffset, currentAnimation],
  );
  const bodyAccessoryOffset = useMemo(
    () => resolveBodyAccessoryOffset(activeChar.parts, currentAnimation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeChar.parts.bodyAccessoryAnimOffsets, activeChar.parts.bodyAccessoryOffset, currentAnimation],
  );
  const curveAnimKeyframeOverrides = (activeChar.animKeyframeOverrides ?? EMPTY_OBJ)[currentAnimation] ?? EMPTY_OBJ;
  const curveAnimation = useMemo(
    () => resolveAnimation(
      activeChar.customAnimations?.find(a => a.id === currentAnimation) ?? ANIMATIONS[currentAnimation],
      curveAnimKeyframeOverrides,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeChar.customAnimations, currentAnimation, curveAnimKeyframeOverrides],
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Slim single-line header */}
      <header className="px-4 py-2 border-b border-border bg-card flex items-center gap-2 shrink-0">
        <h1 className="text-sm font-semibold text-foreground">2D Character Generator</h1>
        <span className="text-muted-foreground/30 select-none">·</span>
        <span className="text-xs text-muted-foreground">Skeletal animation · Modular parts · Export ready</span>
        <div
          ref={headerMenuRef}
          className="ml-auto relative flex items-end"
          onPointerDownCapture={() => { headerTabDownRef.current = headerTab; }}
        >
          <Tabs value={headerTab} onValueChange={setHeaderTab}>
            <TabsList variant="line">
              <TabsTrigger value="workspace" variant="line"
                onClick={() => { if (headerTabDownRef.current === 'workspace') setHeaderTab(''); }}>
                Workspace
              </TabsTrigger>
              <TabsTrigger value="export" variant="line"
                onClick={() => { if (headerTabDownRef.current === 'export') setHeaderTab(''); }}>
                Export
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <WorkspaceMenu
            characters={characters}
            activeCharId={activeCharId}
            uiState={{ currentAnimation, isPlaying, showBones }}
            onLoad={loadWorkspace}
            open={headerTab === 'workspace'}
            onClose={() => setHeaderTab('')}
          />
          <ExportMenu
            onSpriteSheet={() => setSpriteExport({ character: activeChar, animationName: currentAnimation })}
            onSpriteSheetPreview={handlePreviewSpriteSheet}
            onAnimationJSON={() => exportAnimationJSON(activeChar, currentAnimation)}
            onPoseSVG={() => exportPoseSVG(activeChar, currentAnimation, charCanvasRef.current?.getCurrentTime() ?? 0)}
            onPartsSheet={() => exportPartsSheetSVG(activeChar, currentAnimation, charCanvasRef.current?.getCurrentTime() ?? 0)}
            open={headerTab === 'export'}
            onClose={() => setHeaderTab('')}
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
            currentAnimation={currentAnimation}
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
            onEditBodyToggle={() => handleAnimationChange(currentAnimation === 'edit' ? 'idle' : 'edit')}
            onToggleBones={() => setShowBones(p => !p)}
            showBones={showBones}
            onToggleRagdoll={toggleRagdoll}
            ragdoll={ragdoll}
          >
            {currentAnimation !== 'edit' && (<>
            {/* Weapon & Animation — combined since animations are weapon-specific */}
            <Separator className="my-2" />
            <SectionTitle>Animations</SectionTitle>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsPlaying(p => !p)}
                disabled={poseEditorOpen}
                className={cn(
                  'inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1 text-xs font-medium transition-colors hover:bg-secondary/80 disabled:opacity-50',
                )}
              >
                {isPlaying
                  ? <><Pause className="h-3 w-3 mr-1.5" />Pause</>
                  : <><Play  className="h-3 w-3 mr-1.5" />Play</>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditAnimPose(p => {
                    setIsPlaying(p); // entering edit → pause; exiting → resume
                    return !p;
                  });
                }}
                disabled={currentAnimation === 'edit' || poseEditorOpen}
                className={cn(
                  'inline-flex items-center rounded-full border px-4 py-1 text-xs font-medium transition-colors disabled:opacity-50',
                  editAnimPose
                    ? 'bg-teal-400 border-teal-400 text-black hover:bg-teal-400/90'
                    : 'border-border bg-secondary text-foreground hover:bg-secondary/80',
                )}
              >
                <Pencil className="h-3 w-3 mr-1.5" />Edit Animation
              </button>
              {editAnimPose && Object.keys((activeChar.animBoneOffsets ?? {})[currentAnimation] ?? {}).length > 0 && (
                <button
                  type="button"
                  onClick={() => resetAnimPose(currentAnimation)}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex flex-col gap-1.5">
              <SectionTitle>Types</SectionTitle>
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
                {(activeChar.customWeapons ?? []).map(w => (
                  <div key={w.key} className="flex items-center gap-0.5">
                    <button
                      onClick={() => updatePart('weapon', w.key)}
                      className={cn(
                        'px-2.5 py-1 rounded text-xs whitespace-nowrap border transition-colors',
                        activeChar.parts.weapon === w.key
                          ? 'bg-primary border-primary text-primary-foreground font-semibold'
                          : 'bg-secondary border-border text-foreground hover:border-primary',
                      )}
                    >
                      {w.label}
                    </button>
                    <button
                      onClick={() => setWeaponDialog({ mode: 'rename', key: w.key, defaultName: w.label })}
                      title="Rename weapon"
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => deleteCustomWeapon(w.key)}
                      title="Delete weapon"
                      className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setWeaponDialog({ mode: 'create', defaultName: '' })}
                  className="px-2.5 py-1 rounded text-xs whitespace-nowrap border border-dashed border-border text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                >
                  + Weapon
                </button>
              </div>
              </div>

              {/* ── Weapon skin + scale ───────────────────────────────────── */}
              {activeChar.parts.weapon !== 'none' && (() => {
                const weapon = activeChar.parts.weapon;
                const currentWeaponImage = activeChar.parts.weaponImages?.[weapon];
                const curScale = activeChar.parts.weaponScales?.[weapon]
                              ?? activeChar.parts.partScales?.weapon
                              ?? 1;
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setWeaponUploadOpen(true)}
                        title={currentWeaponImage ? `Replace ${weapon} PNG` : `Upload a PNG to skin the ${weapon}`}
                      >
                        <ImageUp className="h-3.5 w-3.5 mr-1.5" />
                        {currentWeaponImage ? "Edit Weapon's Skin" : 'Upload Weapon PNG'}
                      </Button>
                      {currentWeaponImage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateWeaponImage(null)}
                          title={`Remove ${weapon} image (revert to procedural)`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Weapon scale</span>
                      <button
                        onClick={() => updateWeaponScale(Math.max(MIN_WEAPON_SCALE, +((curScale - WEAPON_SCALE_STEP).toFixed(2))))}
                        disabled={curScale <= MIN_WEAPON_SCALE}
                        className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                      >−</button>
                      <span className={cn('text-[11px] min-w-[32px] text-center font-mono', Math.abs(curScale - 1) < 0.001 ? 'text-muted-foreground' : 'text-primary')}>
                        {Math.round(curScale * 100)}%
                      </span>
                      <button
                        onClick={() => updateWeaponScale(Math.min(MAX_WEAPON_SCALE, +((curScale + WEAPON_SCALE_STEP).toFixed(2))))}
                        disabled={curScale >= MAX_WEAPON_SCALE}
                        className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                      >+</button>
                    </div>
                    {editAnimPose && (() => {
                      const wo = resolveWeaponOffset(activeChar.parts, currentAnimation);
                      const isDirty = wo.x !== 0 || wo.y !== 0 || wo.rotation !== 0;
                      return isDirty ? (
                        <button
                          onClick={resetWeaponOffset}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors self-end"
                          title="Reset weapon offset"
                        >
                          Reset offset
                        </button>
                      ) : null;
                    })()}
                  </div>
                );
              })()}

              {/* ── Right arm accessory skin + scale ──────────────────────── */}
              {(() => {
                const weapon = activeChar.parts.weapon;
                const currentAccessoryImage = activeChar.parts.accessoryImages?.[weapon];
                const curScale = resolveAccessoryScale(activeChar.parts);
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAccessoryUploadOpen(true)}
                        title={currentAccessoryImage ? 'Replace right arm accessory PNG' : 'Upload a PNG for the right arm accessory'}
                      >
                        <ImageUp className="h-3.5 w-3.5 mr-1.5" />
                        {currentAccessoryImage ? "Edit Right Arm's Skin" : 'Upload Right Arm Accessory'}
                      </Button>
                      {currentAccessoryImage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateAccessoryImage(null)}
                          title="Remove right arm accessory image"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {currentAccessoryImage && (
                      <div className="flex items-center justify-end gap-0.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Right arm scale</span>
                        <button
                          onClick={() => updateAccessoryScale(Math.max(MIN_ACCESSORY_SCALE, +((curScale - ACCESSORY_SCALE_STEP).toFixed(2))))}
                          disabled={curScale <= MIN_ACCESSORY_SCALE}
                          className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                        >−</button>
                        <span className={cn('text-[11px] min-w-[32px] text-center font-mono', Math.abs(curScale - 1) < 0.001 ? 'text-muted-foreground' : 'text-primary')}>
                          {Math.round(curScale * 100)}%
                        </span>
                        <button
                          onClick={() => updateAccessoryScale(Math.min(MAX_ACCESSORY_SCALE, +((curScale + ACCESSORY_SCALE_STEP).toFixed(2))))}
                          disabled={curScale >= MAX_ACCESSORY_SCALE}
                          className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                        >+</button>
                      </div>
                    )}
                    {currentAccessoryImage && editAnimPose && (() => {
                      const ao = resolveAccessoryOffset(activeChar.parts, currentAnimation);
                      const isDirty = ao.x !== 0 || ao.y !== 0 || ao.rotation !== 0;
                      return isDirty ? (
                        <button
                          onClick={resetAccessoryOffset}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors self-end"
                          title="Reset right arm accessory offset"
                        >
                          Reset right arm offset
                        </button>
                      ) : null;
                    })()}
                  </div>
                );
              })()}

              {/* ── Body accessory (anchored to the torso) ─────────────────── */}
              {(() => {
                const img = activeChar.parts.bodyAccessoryImage;
                const curScale = resolveBodyAccessoryScale(activeChar.parts);
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBodyAccessoryUploadOpen(true)}
                        title={img ? "Replace body's back accessory PNG" : "Upload a PNG anchored behind the body"}
                      >
                        <ImageUp className="h-3.5 w-3.5 mr-1.5" />
                        {img ? "Edit Body's Back Accessory" : "Upload Body's Back Accessory"}
                      </Button>
                      {img && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateBodyAccessoryImage(null)}
                          title="Remove body accessory image"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {img && (
                      <div className="flex items-center justify-end gap-0.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Body scale</span>
                        <button
                          onClick={() => updateBodyAccessoryScale(Math.max(MIN_ACCESSORY_SCALE, +((curScale - ACCESSORY_SCALE_STEP).toFixed(2))))}
                          disabled={curScale <= MIN_ACCESSORY_SCALE}
                          className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                        >−</button>
                        <span className={cn('text-[11px] min-w-[32px] text-center font-mono', Math.abs(curScale - 1) < 0.001 ? 'text-muted-foreground' : 'text-primary')}>
                          {Math.round(curScale * 100)}%
                        </span>
                        <button
                          onClick={() => updateBodyAccessoryScale(Math.min(MAX_ACCESSORY_SCALE, +((curScale + ACCESSORY_SCALE_STEP).toFixed(2))))}
                          disabled={curScale >= MAX_ACCESSORY_SCALE}
                          className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                        >+</button>
                      </div>
                    )}
                    {img && editAnimPose && (() => {
                      const bo = resolveBodyAccessoryOffset(activeChar.parts, currentAnimation);
                      const isDirty = bo.x !== 0 || bo.y !== 0 || bo.rotation !== 0;
                      return isDirty ? (
                        <button
                          onClick={resetBodyAccessoryOffset}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors self-end"
                          title="Reset body accessory offset"
                        >
                          Reset body offset
                        </button>
                      ) : null;
                    })()}
                  </div>
                );
              })()}
            </div>

            <div className="mt-3">
              <AnimationControls
                currentAnimation={currentAnimation}
                weapon={activeChar.parts.weapon}
                customWeapons={activeChar.customWeapons}
                characterName={activeChar.name}
                editAnimPose={editAnimPose}
                customAnimations={activeChar.customAnimations}
                animationLabels={activeChar.animationLabels}
                poseEditorOpen={poseEditorOpen}
                onAnimationChange={handleAnimationChange}
                onNewAnimation={() => setNewAnimDialogOpen(true)}
                onDeleteAnimation={deleteCustomAnimation}
                onRenameAnimation={renameAnimation}
              />
            </div>
            </>)}
          </CharacterBuilder>

          <main className={cn(
            'flex-1 relative overflow-hidden transition-colors duration-200 border-y',
            currentAnimation === 'edit'
              ? 'border-yellow-400 shadow-[inset_0_0_24px_rgba(250,204,21,0.18)]'
              : editAnimPose
              ? 'border-teal-400 shadow-[inset_0_0_24px_rgba(45,212,191,0.15)]'
              : 'border-transparent',
          )}>
              {currentAnimation === 'edit' && (
                <div className="absolute top-3 left-12 z-20 bg-yellow-400 text-black text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md select-none pointer-events-none shadow-[0_0_14px_rgba(250,204,21,0.7)]">
                  Edit Body Mode
                </div>
              )}
              {editAnimPose && currentAnimation !== 'edit' && (
                <div className="absolute top-3 left-12 z-20 bg-teal-400 text-black text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md select-none pointer-events-none shadow-[0_0_14px_rgba(45,212,191,0.7)]">
                  Edit Animation — {(activeChar.customAnimations?.find(a => a.id === currentAnimation) ?? ANIMATIONS[currentAnimation])?.name ?? currentAnimation}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowFrame(p => !p)}
                className={cn(
                  'absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  showFrame
                    ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                    : 'bg-card/80 border-border text-muted-foreground hover:border-amber-400/60 hover:text-amber-400',
                )}
                title="Toggle sprite frame boundary"
              >
                <Frame className="h-3 w-3" />
                Frame
              </button>
              <CharacterCanvas
                ref={charCanvasRef}
                key={poseEditorOpen ? `pose-${activePoseFrame}` : activeCharId}
                character={activeChar.parts}
                boneOffsets={poseEditorOpen ? (poseFrames[activePoseFrame]?.boneOffsets ?? {}) : activeChar.boneOffsets}
                skinOverrides={activeChar.skinOverrides}
                defaultBoneOffsets={activeChar.defaultBoneOffsets}
                defaultSkinOverrides={activeChar.defaultSkinOverrides}
                animBoneOffsets={poseEditorOpen ? EMPTY_OBJ : (activeChar.animBoneOffsets ?? EMPTY_OBJ)}
                animKeyframeOverrides={poseEditorOpen ? EMPTY_OBJ : (activeChar.animKeyframeOverrides ?? EMPTY_OBJ)}
                activeKeyframe={activeKeyframe}
                onKeyframeOverrideChange={updateAnimKeyframeOverride}
                currentAnimation={currentAnimation}
                isPlaying={isPlaying}
                showBones={showBones}
                showFrame={showFrame}
                showVectors={poseEditorOpen ? false : showVectors}
                ragdoll={poseEditorOpen ? true : ragdoll}
                editStructure={poseEditorOpen ? false : editStructure}
                rebindMode={poseEditorOpen ? false : rebindMode}
                showBinds={poseEditorOpen ? false : showBinds}
                selectedSkin={selectedSkin}
                editAnimPose={poseEditorOpen ? false : editAnimPose}
                onionSkin={onionSkin && editAnimPose && !poseEditorOpen}
                customAnimations={activeChar.customAnimations}
                customWeapons={activeChar.customWeapons}
                onAnimationComplete={handleAnimationComplete}
                onBoneOffsetsChange={poseEditorOpen ? updatePoseFrameBones : updateBoneOffsets}
                onSkinOverridesChange={updateSkinOverrides}
                onRagdollOverlayChange={poseEditorOpen ? handlePoseRagdollOverlayChange : undefined}
                onAnimBoneOffsetsChange={poseEditorOpen ? undefined : updateAnimBoneOffsets}
                onSaveDefault={saveCharacterDefault}
                weaponOffset={weaponOffset}
                onWeaponOffsetSet={setWeaponOffsetAbsolute}
                accessoryOffset={accessoryOffset}
                onAccessoryOffsetSet={setAccessoryOffsetAbsolute}
                bodyAccessoryOffset={bodyAccessoryOffset}
                onBodyAccessoryOffsetSet={setBodyAccessoryOffsetAbsolute}
                onSelectBone={editAnimPose && !poseEditorOpen ? selectBone : undefined}
              />
          </main>

          {((currentAnimation === 'edit') || (editAnimPose && !poseEditorOpen)) && (
            <aside className="w-80 shrink-0 bg-card border-l border-border overflow-y-auto p-4 flex flex-col gap-4">
              {currentAnimation === 'edit' && (
                <EditBodyControls
                  showVectors={showVectors}
                  ragdoll={ragdoll}
                  editStructure={editStructure}
                  rebindMode={rebindMode}
                  showBinds={showBinds}
                  selectedSkin={selectedSkin}
                  poseEditorOpen={poseEditorOpen}
                  headScale={activeChar.parts.partScales?.head ?? 1}
                  neckLength={activeChar.parts?.neckLength ?? 72}
                  onToggleVectors={() => setShowVectors(p => !p)}
                  onToggleRagdoll={toggleRagdoll}
                  onToggleEditStructure={toggleEditStructure}
                  onToggleRebindMode={() => setRebindMode(p => !p)}
                  onToggleBinds={() => setShowBinds(p => !p)}
                  onSkinChange={setSelectedSkin}
                  onHeadScaleChange={s => updatePartScale('head', s)}
                  onNeckLengthChange={updateNeckLength}
                />
              )}
              {editAnimPose && !poseEditorOpen && (() => {
                const animHeadUrl = activeChar.parts?.animHeadImages?.[currentAnimation];
                const baseHeadUrl = activeChar.parts?.headImage;
                const hasOverride = !!animHeadUrl;
                const onPickHeadPng = (file) => {
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => updateAnimHeadImage(currentAnimation, reader.result);
                  reader.readAsDataURL(file);
                };
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <SectionTitle>Head skin for this animation</SectionTitle>
                      {hasOverride && (
                        <button
                          type="button"
                          onClick={() => updateAnimHeadImage(currentAnimation, null)}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                          title="Clear override (fall back to the base head skin)"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {animHeadUrl ? (
                        <img
                          src={animHeadUrl}
                          alt="Animation head skin"
                          className="w-12 h-12 object-contain rounded border border-teal-400/40 bg-background/40"
                        />
                      ) : baseHeadUrl ? (
                        <img
                          src={baseHeadUrl}
                          alt="Base head skin"
                          className="w-12 h-12 object-contain rounded border border-border/60 bg-background/40 opacity-60"
                          title="Currently using the base head skin"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded border border-dashed border-border bg-background/40 flex items-center justify-center text-[9px] text-muted-foreground">
                          none
                        </div>
                      )}
                      <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal-400 transition-colors cursor-pointer">
                        <ImageUp className="h-3.5 w-3.5" />
                        {hasOverride ? 'Replace PNG' : 'Upload PNG'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          className="hidden"
                          onChange={(e) => { onPickHeadPng(e.target.files?.[0]); e.target.value = ''; }}
                        />
                      </label>
                    </div>
                    {(animHeadUrl || baseHeadUrl) && (() => {
                      const curScale = activeChar.parts?.animHeadImageScales?.[currentAnimation]
                                    ?? activeChar.parts?.headImageScale ?? 1;
                      const set = (v) => updateAnimHeadImageScale(currentAnimation, +v.toFixed(2));
                      return (
                        <div className="flex items-center justify-end gap-0.5">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Head skin size</span>
                          <button
                            onClick={() => set(Math.max(0.3, curScale - 0.1))}
                            disabled={curScale <= 0.3}
                            className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                          >−</button>
                          <span className={cn('text-[11px] min-w-[32px] text-center font-mono', Math.abs(curScale - 1) < 0.001 ? 'text-muted-foreground' : 'text-primary')}>
                            {Math.round(curScale * 100)}%
                          </span>
                          <button
                            onClick={() => set(Math.min(3, curScale + 0.1))}
                            disabled={curScale >= 3}
                            className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary hover:bg-secondary/80 disabled:opacity-35 disabled:cursor-default transition-colors"
                          >+</button>
                        </div>
                      );
                    })()}
                    {!hasOverride && (
                      <span className="text-[10px] text-muted-foreground/70 leading-relaxed">
                        Upload a PNG that bakes the expression in (e.g. surprised face for Carry).
                        Applies only to <span className="font-mono">{currentAnimation}</span>.
                      </span>
                    )}
                  </div>
                );
              })()}

              {editAnimPose && !poseEditorOpen && (
                <AnimationCurvePanel
                  animation={curveAnimation}
                  offsets={(activeChar.animBoneOffsets ?? EMPTY_OBJ)[currentAnimation] ?? EMPTY_OBJ}
                  overrides={curveAnimKeyframeOverrides}
                  activeKeyframe={activeKeyframe}
                  onKeyframeClick={onKeyframeClick}
                  onCommitOverrides={commitAnimKeyframeOverrides}
                  onSaveAsTemplate={saveAnimAsTemplate}
                  getTime={getCurrentTime}
                  onScrub={seekToTime}
                  onAddKeyframe={addKeyframeAtTime}
                  onDeleteKeyframe={deleteKeyframeAt}
                  onRetimeKeyframe={retimeKeyframe}
                  onSetEase={setKeyframeEase}
                  onSetValue={setKeyframeValue}
                  onSetDuration={setAnimationDuration}
                  onionSkin={onionSkin}
                  onToggleOnion={() => setOnionSkin(p => !p)}
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(p => !p)}
                />
              )}
            </aside>
          )}
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

      <SaveTemplateDialog
        open={!!saveTemplateDialog}
        defaultName={saveTemplateDialog?.defaultName}
        onClose={() => setSaveTemplateDialog(null)}
        onSave={confirmSaveTemplate}
      />

      <NewWeaponDialog
        open={weaponDialog?.mode === 'create'}
        onClose={() => setWeaponDialog(null)}
        onSave={(name, template) => addCustomWeapon(name, template)}
      />

      <SaveTemplateDialog
        open={weaponDialog?.mode === 'rename'}
        defaultName={weaponDialog?.defaultName}
        title="Rename Weapon Mode"
        inputLabel="Weapon name"
        onClose={() => setWeaponDialog(null)}
        onSave={name => renameCustomWeapon(weaponDialog.key, name)}
      />

      <NewAnimationDialog
        open={newAnimDialogOpen}
        onClose={() => setNewAnimDialogOpen(false)}
        templates={animTemplates}
        onDeleteTemplate={deleteAnimTemplate}
        onBlank={openPoseEditor}
        onFromTemplate={createAnimFromTemplate}
        characterName={activeChar.name}
      />

      <WeaponUploadDialog
        open={weaponUploadOpen}
        weaponType={activeChar.parts.weapon}
        currentImage={activeChar.parts.weaponImages?.[activeChar.parts.weapon]}
        onPick={updateWeaponImage}
        onClose={() => setWeaponUploadOpen(false)}
      />

      <AccessoryUploadDialog
        open={accessoryUploadOpen}
        currentImage={activeChar.parts.accessoryImages?.[activeChar.parts.weapon]}
        onPick={updateAccessoryImage}
        onClose={() => setAccessoryUploadOpen(false)}
      />

      <AccessoryUploadDialog
        open={bodyAccessoryUploadOpen}
        currentImage={activeChar.parts.bodyAccessoryImage}
        onPick={updateBodyAccessoryImage}
        onClose={() => setBodyAccessoryUploadOpen(false)}
        title="Upload Body's Back Accessory PNG"
        anchorText="attached behind the torso (body)"
        moveHint="The back accessory moves with the torso, draws behind the body, and persists across weapon changes."
      />

      <SpritePreviewDialog
        open={!!spritePreview}
        character={spritePreview?.character}
        animationName={spritePreview?.animationName}
        onClose={() => setSpritePreview(null)}
      />

      <SpriteExportDialog
        open={!!spriteExport}
        animationName={spriteExport?.animationName}
        onExport={(frameCount, { split = false } = {}) => exportSpriteSheet(spriteExport.character, spriteExport.animationName, { frameCount, split })}
        onClose={() => setSpriteExport(null)}
      />
    </div>
  );
}
