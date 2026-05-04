import { useEffect, useRef, useCallback, useState } from 'react';
import { ANIMATIONS, getPoseAtTime } from '../systems/AnimationSystem.js';
import { BONES, computeWorldTransforms } from '../systems/SkeletonSystem.js';
import { renderCharacter } from '../systems/Renderer.js';
import {
  DEFAULT_SKINS, getSkin, worldToLocal,
  renderVectorOverlay, updateSkinPoint, addSkinPoint,
} from '../systems/VectorEditor.js';
import { solveIK } from '../systems/IKSystem.js';
import { mergeOffsets } from '../utils/transforms.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const CANVAS_W   = 620;
const CANVAS_H   = 640;
const ORIGIN_X   = CANVAS_W / 2;
const ORIGIN_Y   = 490;
const BASE_SCALE = 2.5;

const VECTOR_HIT_PX = 10;
const JOINT_HIT_PX  = 14;

// Joints that stay rigid in ragdoll mode — preserves natural shoulder placement.
// Still draggable in Edit Structure for body customization.
const RAGDOLL_LOCKED = new Set(['left_arm', 'right_arm']);

// ── Component ──────────────────────────────────────────────────────────────────
export function CharacterCanvas({
  character,
  boneOffsets:          initialBoneOffsets,
  skinOverrides:        initialSkinOverrides,
  defaultBoneOffsets:   initialDefaultBoneOffsets,
  defaultSkinOverrides: initialDefaultSkinOverrides,
  currentAnimation, isPlaying,
  showBones, showVectors, ragdoll, editStructure, selectedSkin,
  customAnimations,
  onAnimationComplete,
  onBoneOffsetsChange,
  onSkinOverridesChange,
  onRagdollOverlayChange,
  onSaveDefault,
}) {
  const canvasRef = useRef(null);

  // Reset targets (updated by "Save as Default")
  const defaultBoneOffsets  = useRef(initialDefaultBoneOffsets  ?? {});
  const defaultSkinOverrides = useRef(initialDefaultSkinOverrides ?? {});

  const [boneOffsets,    setBoneOffsets]    = useState(() => initialBoneOffsets   ?? {});
  const [skinOverrides,  setSkinOverrides]  = useState(() => initialSkinOverrides ?? {});
  // Ephemeral pose layer for ragdoll testing — never persisted, cleared when ragdoll toggles off.
  const [ragdollOverlay, setRagdollOverlay] = useState({});
  const [zoomPct,        setZoomPct]        = useState(100);

  const dragRef    = useRef(null);
  const panDragRef = useRef(null);
  const viewRef    = useRef({ zoom: 1, panX: 0, panY: 0 });

  // Undo history — session-only, capped at 60 entries
  const historyRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  const stateRef = useRef({
    time: 0, lastTimestamp: null,
    currentAnimation, isPlaying, character,
    showBones, showVectors, ragdoll, editStructure, selectedSkin,
    boneOffsets: {}, skinOverrides: {}, ragdollOverlay: {},
    lastWorldTransforms: null,
    vectorHitTargets: [],
  });

  stateRef.current.currentAnimation = currentAnimation;
  stateRef.current.isPlaying        = isPlaying;
  stateRef.current.character        = character;
  stateRef.current.showBones        = showBones;
  stateRef.current.showVectors      = showVectors;
  stateRef.current.ragdoll          = ragdoll;
  stateRef.current.editStructure    = editStructure;
  stateRef.current.selectedSkin     = selectedSkin;
  stateRef.current.boneOffsets      = boneOffsets;
  stateRef.current.skinOverrides    = skinOverrides;
  stateRef.current.ragdollOverlay   = ragdollOverlay;
  stateRef.current.customAnimations = customAnimations;

  // Notify parent of bone/skin/overlay changes (skip the very first render)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) return;
    onBoneOffsetsChange?.(boneOffsets);
  }, [boneOffsets]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (firstRender.current) return;
    onSkinOverridesChange?.(skinOverrides);
  }, [skinOverrides]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (firstRender.current) return;
    onRagdollOverlayChange?.(ragdollOverlay);
  }, [ragdollOverlay]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { firstRender.current = false; }, []);

  useEffect(() => {
    stateRef.current.time = 0;
    stateRef.current.lastTimestamp = null;
  }, [currentAnimation]);

  // Drop the ephemeral ragdoll pose whenever ragdoll is turned off.
  useEffect(() => {
    if (!ragdoll) setRagdollOverlay(o => Object.keys(o).length === 0 ? o : {});
  }, [ragdoll]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect   = canvas.getBoundingClientRect();
      const ratio  = CANVAS_W / rect.width;
      const cx     = (e.clientX - rect.left) * ratio;
      const cy     = (e.clientY - rect.top)  * ratio;
      const { zoom, panX, panY } = viewRef.current;
      const originX = ORIGIN_X + panX, originY = ORIGIN_Y + panY;
      const scale   = BASE_SCALE * zoom;
      const charX   = (cx - originX) / scale, charY = (cy - originY) / scale;
      const factor  = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(0.25, Math.min(12, zoom * factor));
      const ns      = BASE_SCALE * newZoom;
      viewRef.current = { zoom: newZoom, panX: cx - charX * ns - ORIGIN_X, panY: cy - charY * ns - ORIGIN_Y };
      setZoomPct(Math.round(newZoom * 100));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // ── RAF draw loop ─────────────────────────────────────────────────────────────
  const drawFrame = useCallback((timestamp) => {
    const s = stateRef.current;
    if (s.lastTimestamp === null) s.lastTimestamp = timestamp;
    const delta = Math.min((timestamp - s.lastTimestamp) / 1000, 0.05);
    s.lastTimestamp = timestamp;

    const anim = ANIMATIONS[s.currentAnimation]
      ?? s.customAnimations?.find(a => a.id === s.currentAnimation);
    if (anim && s.isPlaying) {
      s.time += delta;
      if (anim.loop)                       s.time %= anim.duration;
      else if (s.time >= anim.duration) {
        s.time = anim.duration;
        onAnimationComplete?.(s.currentAnimation);
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke(); }
    for (let y = 0; y < CANVAS_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke(); }

    const { zoom, panX, panY } = viewRef.current;
    const originX = ORIGIN_X + panX, originY = ORIGIN_Y + panY;
    const scale   = BASE_SCALE * zoom;

    ctx.save();
    ctx.translate(originX, originY + 6 * zoom);
    const sg = ctx.createRadialGradient(0, 0, 8, 0, 0, 70);
    sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.scale(zoom, zoom * 0.3);
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(60, originY + 2); ctx.lineTo(CANVAS_W - 60, originY + 2); ctx.stroke();

    const animPose         = anim ? getPoseAtTime(anim, s.time) : {};
    const persistentOffsets = mergeOffsets(s.boneOffsets, s.ragdollOverlay);
    const fullPose         = mergeOffsets(animPose, persistentOffsets);
    const worldTransforms  = computeWorldTransforms(fullPose);
    s.lastWorldTransforms = worldTransforms;

    const skins = {};
    for (const key of Object.keys(DEFAULT_SKINS)) skins[key] = getSkin(key, s.skinOverrides);

    const drag = dragRef.current;
    renderCharacter(ctx, s.character, worldTransforms, {
      originX, originY, scale,
      showBones:     s.showBones,
      highlightBone: drag?.type === 'bone' ? drag.boneId : null,
      skins,
      animation: s.currentAnimation,
    });

    if (s.showVectors) {
      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(scale, scale);
      const activeVec    = drag?.type !== 'bone' ? drag : null;
      const visualScale  = 1 / zoom;
      s.vectorHitTargets = renderVectorOverlay(ctx, worldTransforms, s.skinOverrides, activeVec, s.selectedSkin, visualScale);
      ctx.restore();
    } else {
      s.vectorHitTargets = [];
    }

    if (anim) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '12px monospace';
      ctx.fillText(`${anim.name}  ${s.time.toFixed(2)}s / ${anim.duration.toFixed(2)}s`, 12, 20);
    }
  }, [onAnimationComplete]);

  useEffect(() => {
    let rafId;
    const loop = (ts) => { drawFrame(ts); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [drawFrame]);

  // ── Coordinate helpers ────────────────────────────────────────────────────────
  const getCharPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect  = canvas.getBoundingClientRect();
    const ratio = CANVAS_W / rect.width;
    const cx    = (e.clientX - rect.left) * ratio;
    const cy    = (e.clientY - rect.top)  * ratio;
    const { zoom, panX, panY } = viewRef.current;
    return {
      x: (cx - ORIGIN_X - panX) / (BASE_SCALE * zoom),
      y: (cy - ORIGIN_Y - panY) / (BASE_SCALE * zoom),
    };
  }, []);

  const hitRadius = useCallback((screenPx) => {
    const canvas = canvasRef.current;
    if (!canvas) return screenPx;
    const rect  = canvas.getBoundingClientRect();
    const ratio = CANVAS_W / rect.width;
    return screenPx * ratio / (BASE_SCALE * viewRef.current.zoom);
  }, []);

  const findTarget = useCallback(({ x, y }) => {
    const s = stateRef.current;
    if (s.showVectors) {
      const r = hitRadius(VECTOR_HIT_PX);
      let closest = null, minDist = r;
      for (const t of s.vectorHitTargets) {
        const d = Math.hypot(t.x - x, t.y - y);
        if (d < minDist) { minDist = d; closest = t; }
      }
      if (closest) return closest;
    }
    const wt = s.lastWorldTransforms;
    if (wt && (s.ragdoll || s.editStructure)) {
      const r = hitRadius(JOINT_HIT_PX);
      const ragdollOnly = s.ragdoll && !s.editStructure;
      let closest = null, minDist = r;
      for (const [boneId, bone] of Object.entries(wt)) {
        if (ragdollOnly && RAGDOLL_LOCKED.has(boneId)) continue;
        const d = Math.hypot(bone.x - x, bone.y - y);
        if (d < minDist) { minDist = d; closest = boneId; }
      }
      if (closest) return { type: 'bone', boneId: closest };
    }
    return null;
  }, [hitRadius]);

  // ── Undo ──────────────────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    const s = stateRef.current;
    const snapshot = {
      boneOffsets:    Object.fromEntries(Object.entries(s.boneOffsets).map(([k, v]) => [k, { ...v }])),
      skinOverrides:  Object.fromEntries(Object.entries(s.skinOverrides).map(([k, pts]) => [k, pts.map(p => [...p])])),
      ragdollOverlay: Object.fromEntries(Object.entries(s.ragdollOverlay).map(([k, v]) => [k, { ...v }])),
    };
    const hist = historyRef.current;
    if (hist.length >= 60) hist.shift();
    hist.push(snapshot);
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    const hist = historyRef.current;
    if (hist.length === 0) return;
    const snapshot = hist.pop();
    setCanUndo(hist.length > 0);
    setBoneOffsets(snapshot.boneOffsets);
    setSkinOverrides(snapshot.skinOverrides);
    setRagdollOverlay(snapshot.ragdollOverlay ?? {});
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  // ── Mouse handlers ────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) {
      const { panX, panY } = viewRef.current;
      panDragRef.current = { startClientX: e.clientX, startClientY: e.clientY, startPanX: panX, startPanY: panY };
      if (canvasRef.current) canvasRef.current.style.cursor = 'move';
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    if (stateRef.current.currentAnimation !== 'edit') return;

    const charPos = getCharPos(e);
    const target  = findTarget(charPos);
    if (target) {
      pushHistory();
      dragRef.current = target;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      e.preventDefault();
    } else if (e.ctrlKey) {
      const s = stateRef.current;
      if (s.showVectors && s.selectedSkin !== 'all' && s.lastWorldTransforms) {
        pushHistory();
        setSkinOverrides(prev =>
          addSkinPoint(prev, s.selectedSkin, s.lastWorldTransforms, charPos.x, charPos.y)
        );
        e.preventDefault();
      }
    }
  }, [getCharPos, findTarget]);

  const handleMouseMove = useCallback((e) => {
    if (panDragRef.current) {
      const dp     = panDragRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio  = CANVAS_W / canvas.getBoundingClientRect().width;
      viewRef.current = {
        ...viewRef.current,
        panX: dp.startPanX + (e.clientX - dp.startClientX) * ratio,
        panY: dp.startPanY + (e.clientY - dp.startClientY) * ratio,
      };
      return;
    }

    const charPos = getCharPos(e);
    const drag    = dragRef.current;

    if (!drag) {
      const s       = stateRef.current;
      const isEdit  = s.currentAnimation === 'edit';
      const hovered = isEdit ? findTarget(charPos) : null;
      const addMode = isEdit && s.showVectors && s.selectedSkin !== 'all' && e.ctrlKey;
      if (canvasRef.current)
        canvasRef.current.style.cursor = hovered ? 'grab' : addMode ? 'crosshair' : 'default';
      return;
    }

    const s  = stateRef.current;
    const wt = s.lastWorldTransforms;
    if (!wt) return;

    if (drag.type === 'bone') {
      if (s.editStructure) {
        const bone = BONES[drag.boneId];
        if (!bone) return;
        let newOffX, newOffY;
        if (!bone.parent) {
          newOffX = charPos.x - bone.localX;
          newOffY = charPos.y - bone.localY;
        } else {
          const par = wt[bone.parent];
          const cos = Math.cos(par.rotation), sin = Math.sin(par.rotation);
          const dx  = charPos.x - par.x,      dy  = charPos.y - par.y;
          newOffX = cos * dx + sin * dy - bone.localX;
          newOffY = -sin * dx + cos * dy - bone.localY;
        }
        setBoneOffsets(prev => ({
          ...prev,
          [drag.boneId]: { ...(prev[drag.boneId] || {}), x: newOffX, y: newOffY },
        }));
      } else {
        // Ragdoll: solve on combined (persistent + overlay), apply only the delta
        // to the ephemeral overlay so persistent boneOffsets stay untouched.
        setRagdollOverlay(prevOverlay => {
          const combined = mergeOffsets(s.boneOffsets, prevOverlay);
          const next     = solveIK(combined, drag.boneId, charPos.x, charPos.y);
          const out      = { ...prevOverlay };
          for (const id of Object.keys(next)) {
            const o = combined[id] || {};
            const n = next[id]     || {};
            const dx = (n.x        || 0) - (o.x        || 0);
            const dy = (n.y        || 0) - (o.y        || 0);
            const dr = (n.rotation || 0) - (o.rotation || 0);
            if (Math.abs(dx) > 1e-9 || Math.abs(dy) > 1e-9 || Math.abs(dr) > 1e-9) {
              const cur = out[id] || {};
              out[id] = {
                x:        (cur.x        || 0) + dx,
                y:        (cur.y        || 0) + dy,
                rotation: (cur.rotation || 0) + dr,
              };
            }
          }
          return out;
        });
      }
      return;
    }

    const { type, skinKey, pointIndex } = drag;
    const template = getSkin(skinKey, s.skinOverrides);
    const [boneId, lx, ly] = template[pointIndex];
    const bone = wt[boneId];
    if (!bone) return;

    const cos = Math.cos(bone.rotation), sin = Math.sin(bone.rotation);
    let update;
    if (type === 'anchor') {
      const local = worldToLocal(charPos.x, charPos.y, bone);
      update = { type: 'anchor', lx: local.x, ly: local.y };
    } else {
      const anchorX = bone.x + cos * lx - sin * ly;
      const anchorY = bone.y + sin * lx + cos * ly;
      const dx = charPos.x - anchorX, dy = charPos.y - anchorY;
      update = { type, dx: cos * dx + sin * dy, dy: -sin * dx + cos * dy };
    }
    setSkinOverrides(prev => updateSkinPoint(prev, skinKey, pointIndex, update));
  }, [getCharPos, findTarget]);

  const stopDrag = useCallback(() => {
    dragRef.current    = null;
    panDragRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, []);

  // ── Zoom helpers ──────────────────────────────────────────────────────────────
  const stepZoom = useCallback((factor) => {
    const { zoom, panX, panY } = viewRef.current;
    const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
    const originX = ORIGIN_X + panX, originY = ORIGIN_Y + panY;
    const scale   = BASE_SCALE * zoom;
    const charX   = (cx - originX) / scale, charY = (cy - originY) / scale;
    const newZoom  = Math.max(0.25, Math.min(12, zoom * factor));
    const newScale = BASE_SCALE * newZoom;
    viewRef.current = { zoom: newZoom, panX: cx - charX * newScale - ORIGIN_X, panY: cy - charY * newScale - ORIGIN_Y };
    setZoomPct(Math.round(newZoom * 100));
  }, []);

  const resetView = useCallback(() => {
    viewRef.current = { zoom: 1, panX: 0, panY: 0 };
    setZoomPct(100);
  }, []);

  // ── Reset / Save as Default ───────────────────────────────────────────────────
  const resetBones = useCallback(() => setBoneOffsets(defaultBoneOffsets.current),    []);
  const resetSkins = useCallback(() => setSkinOverrides(defaultSkinOverrides.current), []);

  const saveAsDefault = useCallback(() => {
    const bones = stateRef.current.boneOffsets;
    const skins = stateRef.current.skinOverrides;
    defaultBoneOffsets.current  = bones;
    defaultSkinOverrides.current = skins;
    onSaveDefault?.(bones, skins);
    setBoneOffsets({ ...bones });
    setSkinOverrides({ ...skins });
  }, [onSaveDefault]);

  // ── Mirror ────────────────────────────────────────────────────────────────────
  const mirrorLimb = useCallback((fromSide, limbType) => {
    pushHistory();
    const pairs = limbType === 'legs'
      ? [['left_leg','right_leg'], ['left_shin','right_shin'], ['left_foot','right_foot']]
      : [['left_arm','right_arm'], ['left_forearm','right_forearm'], ['left_hand','right_hand']];

    const fromBones  = pairs.map(p => fromSide === 'left' ? p[0] : p[1]);
    const toBones    = pairs.map(p => fromSide === 'left' ? p[1] : p[0]);
    const boneIdMap  = Object.fromEntries(pairs.map(([l, r]) => fromSide === 'left' ? [l, r] : [r, l]));
    const fromSkinKey = fromSide === 'left'
      ? (limbType === 'legs' ? 'left_leg'  : 'left_arm')
      : (limbType === 'legs' ? 'right_leg' : 'right_arm');
    const toSkinKey = fromSide === 'left'
      ? (limbType === 'legs' ? 'right_leg' : 'right_arm')
      : (limbType === 'legs' ? 'left_leg'  : 'left_arm');

    setBoneOffsets(prev => {
      const next = { ...prev };
      fromBones.forEach((fromId, i) => {
        const toId = toBones[i];
        const off  = prev[fromId];
        if (off) next[toId] = { x: off.x || 0, y: off.y || 0, rotation: -(off.rotation || 0) };
        else     delete next[toId];
      });
      return next;
    });

    setSkinOverrides(prev => {
      const src    = getSkin(fromSkinKey, prev);
      const copied = src.map(([boneId, lx, ly, hInDx, hInDy, hOutDx, hOutDy]) => [
        boneIdMap[boneId] ?? boneId,
        lx, ly, hInDx, hInDy, hOutDx, hOutDy,
      ]);
      return { ...prev, [toSkinKey]: copied };
    });
  }, [pushHistory]);

  const hasBoneEdits = JSON.stringify(boneOffsets)   !== JSON.stringify(defaultBoneOffsets.current);
  const hasSkinEdits = JSON.stringify(skinOverrides) !== JSON.stringify(defaultSkinOverrides.current);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ display: 'block', borderRadius: '8px' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Zoom controls */}
      <div style={ZOOM_BAR_STYLE}>
        <button style={ZOOM_BTN} onClick={() => stepZoom(1 / 1.3)}>−</button>
        <span style={ZOOM_LABEL}>{zoomPct}%</span>
        <button style={ZOOM_BTN} onClick={() => stepZoom(1.3)}>+</button>
        {zoomPct !== 100 && (
          <button style={{ ...ZOOM_BTN, marginLeft: 2, fontSize: 13 }} onClick={resetView} title="Reset view">⌂</button>
        )}
      </div>

      {/* Top-right controls */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        {(hasBoneEdits || hasSkinEdits) && (
          <div style={{ display: 'flex', gap: 6 }}>
            {hasBoneEdits && <button onClick={resetBones} style={resetBtnStyle('#ef4444')}>Reset joints</button>}
            {hasSkinEdits && <button onClick={resetSkins} style={resetBtnStyle('#f97316')}>Reset shape</button>}
          </div>
        )}
        {canUndo && (
          <button onClick={undo} style={resetBtnStyle('#6366f1')} title="Undo (Ctrl+Z)">Undo</button>
        )}
        {currentAnimation === 'edit' && (
          <button onClick={saveAsDefault} style={resetBtnStyle('#22c55e')} title="Save current joints and shape as the reset target">
            Save as Default
          </button>
        )}
      </div>

      {/* Mirror controls — edit mode only */}
      {currentAnimation === 'edit' && (
        <div style={MIRROR_PANEL_STYLE}>
          <span style={MIRROR_LABEL}>Mirror</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={MIRROR_BTN} onClick={() => mirrorLimb('left',  'arms')}>L→R Arms</button>
            <button style={MIRROR_BTN} onClick={() => mirrorLimb('right', 'arms')}>R→L Arms</button>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button style={MIRROR_BTN} onClick={() => mirrorLimb('left',  'legs')}>L→R Legs</button>
            <button style={MIRROR_BTN} onClick={() => mirrorLimb('right', 'legs')}>R→L Legs</button>
          </div>
        </div>
      )}

      {showVectors && zoomPct > 110 && (
        <div style={HINT_STYLE}>Right-click drag to pan</div>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const ZOOM_BAR_STYLE = {
  position: 'absolute', bottom: 10, left: 10,
  display: 'flex', alignItems: 'center', gap: 2,
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
  borderRadius: 6, padding: '3px 6px',
};
const ZOOM_BTN = {
  background: 'none', border: 'none', color: '#ccc',
  fontSize: 16, lineHeight: 1, cursor: 'pointer', padding: '1px 5px', borderRadius: 4,
};
const ZOOM_LABEL = {
  color: '#ddd', fontFamily: 'monospace', fontSize: 11, minWidth: 38, textAlign: 'center',
};
const HINT_STYLE = {
  position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
  color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', fontSize: 10,
  pointerEvents: 'none', whiteSpace: 'nowrap',
};
const resetBtnStyle = (bg) => ({
  padding: '4px 10px', fontSize: '11px', fontFamily: 'monospace',
  background: bg, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: 0.9,
});
const MIRROR_PANEL_STYLE = {
  position: 'absolute', top: 10, left: 10,
  display: 'flex', flexDirection: 'column', gap: 4,
  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
  borderRadius: 6, padding: '6px 8px',
};
const MIRROR_LABEL = {
  fontSize: 10, color: 'rgba(255,255,255,0.45)',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2,
};
const MIRROR_BTN = {
  padding: '3px 7px', fontSize: '10px', fontFamily: 'monospace',
  background: 'rgba(255,255,255,0.12)', color: '#ddd',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, cursor: 'pointer',
};
