import { useEffect, useRef, useCallback, useState } from 'react';
import { ANIMATIONS, getPoseAtTime } from '../systems/AnimationSystem.js';
import { BONES, computeWorldTransforms } from '../systems/SkeletonSystem.js';
import { renderCharacter } from '../systems/Renderer.js';
import {
  DEFAULT_SKINS, SKIN_COLORS, getSkin, worldToLocal,
  renderVectorOverlay, renderBoneBinds, updateSkinPoint, addSkinPoint, rebindSkinPoint,
  deleteSkinPoint,
} from '../systems/VectorEditor.js';
import { strokeSkinOutline } from '../systems/SkinSystem.js';
import { solveIK } from '../systems/IKSystem.js';
import { mergeOffsets } from '../utils/transforms.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const CANVAS_W   = 868;
const CANVAS_H   = 896;
const ORIGIN_X   = CANVAS_W / 2;
const ORIGIN_Y   = 686;
const BASE_SCALE = 2.5;

const VECTOR_HIT_PX = 10;
const JOINT_HIT_PX  = 14;

// Joints that stay rigid in ragdoll mode — preserves natural shoulder placement.
// Still draggable in Edit Structure for body customization.
const RAGDOLL_LOCKED = new Set(['left_arm', 'right_arm']);

// Rotation handles for bones that have no IK rotation control of their own
// (the upper arms — joints 4 and 7). The handle sits at the given bone-local
// offset and dragging it sets the bone's rotation directly.
const ROTATE_HANDLES = [
  { boneId: 'left_arm',  lx: -12, ly: 0 },
  { boneId: 'right_arm', lx:  12, ly: 0 },
];

// ── Component ──────────────────────────────────────────────────────────────────
export function CharacterCanvas({
  character,
  boneOffsets:          initialBoneOffsets,
  skinOverrides:        initialSkinOverrides,
  defaultBoneOffsets:   initialDefaultBoneOffsets,
  defaultSkinOverrides: initialDefaultSkinOverrides,
  currentAnimation, isPlaying,
  showBones, showVectors, ragdoll, editStructure, rebindMode, showBinds, selectedSkin,
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
  // Decoded HTMLImageElements for character.bodyImage / character.headImage
  // (data URLs). Reload whenever the prop changes; null while loading.
  const bodyImageRef = useRef(null);
  const headImageRef = useRef(null);

  // Undo history — session-only, capped at 60 entries
  const historyRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  const stateRef = useRef({
    time: 0, lastTimestamp: null,
    currentAnimation, isPlaying, character,
    showBones, showVectors, ragdoll, editStructure, rebindMode, showBinds, selectedSkin,
    boneOffsets: {}, skinOverrides: {}, ragdollOverlay: {},
    lastWorldTransforms: null,
    vectorHitTargets: [],
    rotateHitTargets: [],
  });

  stateRef.current.currentAnimation = currentAnimation;
  stateRef.current.isPlaying        = isPlaying;
  stateRef.current.character        = character;
  stateRef.current.showBones        = showBones;
  stateRef.current.showVectors      = showVectors;
  stateRef.current.ragdoll          = ragdoll;
  stateRef.current.editStructure    = editStructure;
  stateRef.current.rebindMode       = rebindMode;
  stateRef.current.showBinds        = showBinds;
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

  // Decode the character's body image so the renderer can drawImage it.
  useEffect(() => {
    const url = character?.bodyImage;
    if (!url) { bodyImageRef.current = null; return; }
    const img = new Image();
    img.onload = () => { bodyImageRef.current = img; };
    img.onerror = () => { bodyImageRef.current = null; };
    img.src = url;
    return () => { img.onload = img.onerror = null; };
  }, [character?.bodyImage]);

  // Same for the head image.
  useEffect(() => {
    const url = character?.headImage;
    if (!url) { headImageRef.current = null; return; }
    const img = new Image();
    img.onload = () => { headImageRef.current = img; };
    img.onerror = () => { headImageRef.current = null; };
    img.src = url;
    return () => { img.onload = img.onerror = null; };
  }, [character?.headImage]);

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
      animation:     s.currentAnimation,
      bodyImage:     bodyImageRef.current,
      headImage:     headImageRef.current,
    });

    if (s.showVectors) {
      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(scale, scale);
      const activeVec    = drag?.type !== 'bone' && drag?.type !== 'rotate' ? drag : null;
      const visualScale  = 1 / zoom;

      // Stroke the selected part's outline so the user can see the contour
      // they're shaping while the rest of the character keeps its filled look.
      if (s.selectedSkin !== 'all') {
        const tmpl = getSkin(s.selectedSkin, s.skinOverrides);
        const col  = SKIN_COLORS[s.selectedSkin]?.anchor ?? '#fff';
        if (tmpl) strokeSkinOutline(ctx, tmpl, worldTransforms, col, 1.2 * visualScale);
      }

      if (s.showBinds) {
        renderBoneBinds(ctx, worldTransforms, s.skinOverrides, s.selectedSkin, visualScale);
      }
      s.vectorHitTargets = renderVectorOverlay(ctx, worldTransforms, s.skinOverrides, activeVec, s.selectedSkin, visualScale);
      ctx.restore();
    } else {
      s.vectorHitTargets = [];
    }

    if (s.showBones && (s.ragdoll || s.editStructure)) {
      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(scale, scale);
      const visualScale = 1 / zoom;
      const r = 3 * visualScale;
      const targets = [];
      for (const h of ROTATE_HANDLES) {
        const bone = worldTransforms[h.boneId];
        if (!bone) continue;
        const c = Math.cos(bone.rotation), sn = Math.sin(bone.rotation);
        const hx = bone.x + c * h.lx - sn * h.ly;
        const hy = bone.y + sn * h.lx + c * h.ly;
        const active = drag?.type === 'rotate' && drag.boneId === h.boneId;
        ctx.lineWidth   = 0.8 * visualScale;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.fillStyle   = active ? '#FFFFFF' : '#FF66FF';
        ctx.beginPath();
        ctx.arc(hx, hy, active ? r * 1.4 : r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        targets.push({ boneId: h.boneId, lx: h.lx, ly: h.ly, x: hx, y: hy });
      }
      s.rotateHitTargets = targets;
      ctx.restore();
    } else {
      s.rotateHitTargets = [];
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
      // Rotation handles take priority over joints (smaller, drawn on top).
      let closestRot = null, minRotDist = r;
      for (const h of s.rotateHitTargets) {
        const d = Math.hypot(h.x - x, h.y - y);
        if (d < minRotDist) { minRotDist = d; closestRot = h; }
      }
      if (closestRot) return { type: 'rotate', boneId: closestRot.boneId, lx: closestRot.lx, ly: closestRot.ly };

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
      if (e.altKey && target.type === 'anchor') {
        pushHistory();
        setSkinOverrides(prev => deleteSkinPoint(prev, target.skinKey, target.pointIndex));
        e.preventDefault();
        return;
      }
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

    if (drag.type === 'rotate') {
      const armBone = wt[drag.boneId];
      if (!armBone) return;
      const parentDef = BONES[BONES[drag.boneId].parent];
      const pw = parentDef ? wt[parentDef.id] : { rotation: 0 };
      const cursorAngle     = Math.atan2(charPos.y - armBone.y, charPos.x - armBone.x);
      const handleRestAngle = Math.atan2(drag.ly, drag.lx);
      const desiredWorldRot = cursorAngle - handleRestAngle;
      const desiredLocalRot = desiredWorldRot - pw.rotation;
      const newRotation     = desiredLocalRot - BONES[drag.boneId].baseRotation;

      if (s.editStructure) {
        setBoneOffsets(prev => ({
          ...prev,
          [drag.boneId]: { ...(prev[drag.boneId] || {}), rotation: newRotation },
        }));
      } else {
        setRagdollOverlay(prev => {
          const combined = mergeOffsets(s.boneOffsets, prev);
          const curRot   = (combined[drag.boneId]?.rotation) || 0;
          const dr       = newRotation - curRot;
          if (Math.abs(dr) < 1e-9) return prev;
          const overlay  = prev[drag.boneId] || {};
          return {
            ...prev,
            [drag.boneId]: {
              x:        overlay.x        || 0,
              y:        overlay.y        || 0,
              rotation: (overlay.rotation || 0) + dr,
            },
          };
        });
      }
      return;
    }

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

    if (type === 'anchor' && s.rebindMode) {
      setSkinOverrides(prev => rebindSkinPoint(prev, skinKey, pointIndex, wt, charPos.x, charPos.y));
      return;
    }

    const cos = Math.cos(bone.rotation), sin = Math.sin(bone.rotation);
    let update;
    if (type === 'anchor') {
      const local = worldToLocal(charPos.x, charPos.y, bone);
      update = { type: 'anchor', lx: local.x, ly: local.y };
    } else {
      const anchorX = bone.x + cos * lx - sin * ly;
      const anchorY = bone.y + sin * lx + cos * ly;
      const dx = charPos.x - anchorX, dy = charPos.y - anchorY;
      update = { type, dx: cos * dx + sin * dy, dy: -sin * dx + cos * dy, mirror: e.ctrlKey };
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

  // ── Replicate (copy without rotation negation) ───────────────────────────────
  const replicateLimb = useCallback((fromSide, limbType) => {
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
        if (off) next[toId] = { x: off.x || 0, y: off.y || 0, rotation: off.rotation || 0 };
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
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="block rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-0.5 bg-black/55 backdrop-blur-sm rounded-md px-1.5 py-0.5">
        <button onClick={() => stepZoom(1 / 1.3)} className="text-zinc-300 hover:text-white text-base px-1 py-0.5">−</button>
        <span className="text-zinc-300 font-mono text-[11px] min-w-[38px] text-center">{zoomPct}%</span>
        <button onClick={() => stepZoom(1.3)} className="text-zinc-300 hover:text-white text-base px-1 py-0.5">+</button>
        {zoomPct !== 100 && (
          <button onClick={resetView} title="Reset view" className="text-zinc-300 hover:text-white text-sm ml-0.5 px-1 py-0.5">⌂</button>
        )}
      </div>

      {/* Top-right controls */}
      <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
        {(hasBoneEdits || hasSkinEdits) && (
          <div className="flex gap-1.5">
            {hasBoneEdits && (
              <button
                onClick={resetBones}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded px-2.5 py-1 text-[11px] font-mono shadow-md transition-colors"
              >
                Reset joints
              </button>
            )}
            {hasSkinEdits && (
              <button
                onClick={resetSkins}
                className="bg-orange-500 text-white hover:bg-orange-500/90 rounded px-2.5 py-1 text-[11px] font-mono shadow-md transition-colors"
              >
                Reset shape
              </button>
            )}
          </div>
        )}
        {canUndo && (
          <button
            onClick={undo}
            title="Undo (Ctrl+Z)"
            className="bg-indigo-500 text-white hover:bg-indigo-500/90 rounded px-2.5 py-1 text-[11px] font-mono shadow-md transition-colors"
          >
            Undo
          </button>
        )}
        {currentAnimation === 'edit' && (
          <button
            onClick={saveAsDefault}
            title="Save current joints and shape as the reset target"
            className="bg-emerald-500 text-white hover:bg-emerald-500/90 rounded px-2.5 py-1 text-[11px] font-mono shadow-md transition-colors"
          >
            Save as Default
          </button>
        )}
      </div>

      {/* Mirror / Copy controls — edit mode only */}
      {currentAnimation === 'edit' && (
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 bg-black/55 backdrop-blur-sm rounded-md px-2 py-1.5">
          <CanvasPanelLabel>Mirror</CanvasPanelLabel>
          <div className="flex gap-1">
            <CanvasPanelButton onClick={() => mirrorLimb('left',  'arms')}>L→R Arms</CanvasPanelButton>
            <CanvasPanelButton onClick={() => mirrorLimb('right', 'arms')}>R→L Arms</CanvasPanelButton>
          </div>
          <div className="flex gap-1">
            <CanvasPanelButton onClick={() => mirrorLimb('left',  'legs')}>L→R Legs</CanvasPanelButton>
            <CanvasPanelButton onClick={() => mirrorLimb('right', 'legs')}>R→L Legs</CanvasPanelButton>
          </div>
          <CanvasPanelLabel className="mt-1">Copy</CanvasPanelLabel>
          <div className="flex gap-1">
            <CanvasPanelButton onClick={() => replicateLimb('left',  'arms')}>L→R Arms</CanvasPanelButton>
            <CanvasPanelButton onClick={() => replicateLimb('right', 'arms')}>R→L Arms</CanvasPanelButton>
          </div>
          <div className="flex gap-1">
            <CanvasPanelButton onClick={() => replicateLimb('left',  'legs')}>L→R Legs</CanvasPanelButton>
            <CanvasPanelButton onClick={() => replicateLimb('right', 'legs')}>R→L Legs</CanvasPanelButton>
          </div>
        </div>
      )}

      {showVectors && zoomPct > 110 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-white/45 font-mono text-[10px] pointer-events-none whitespace-nowrap">
          Right-click drag to pan
        </div>
      )}
    </div>
  );
}

function CanvasPanelLabel({ className = '', children }) {
  return (
    <span className={`text-[10px] uppercase tracking-wider text-white/45 mb-0.5 ${className}`}>
      {children}
    </span>
  );
}

function CanvasPanelButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 text-[10px] font-mono bg-white/10 text-zinc-200 border border-white/15 rounded hover:bg-white/20 hover:border-primary transition-colors"
    >
      {children}
    </button>
  );
}
