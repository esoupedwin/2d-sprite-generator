import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { ANIMATIONS, getPoseAtTime, resolveAnimation, keyframeTimeKey } from '../systems/AnimationSystem.js';
import { BONES, computeWorldTransforms } from '../systems/SkeletonSystem.js';
import { renderCharacter } from '../systems/Renderer.js';
import {
  DEFAULT_SKINS, SKIN_COLORS, getSkin,
  renderVectorOverlay, renderBoneBinds, updateSkinPoint, addSkinPoint, rebindSkinPoint,
  deleteSkinPoint,
} from '../systems/VectorEditor.js';
import { strokeSkinOutline } from '../systems/SkinSystem.js';
import { solveIK } from '../systems/IKSystem.js';
import { mergeOffsets } from '../utils/transforms.js';
import { worldToLocal } from '../utils/mathUtils.js';
import { FRAME_W, FRAME_H, FRAME_ORIGIN_X, FRAME_ORIGIN_Y } from '../utils/spriteExportConfig.js';
import { useImageDataUrl } from '../hooks/useImageDataUrl.js';

// ── Constants ──────────────────────────────────────────────────────────────────
// The canvas backing buffer is sized to match its rendered container so the
// drawing area always fills the center panel. Origin sits at horizontal
// center; pushed below the canvas vertical center by ORIGIN_Y_OFFSET so the
// character's visual midpoint (which sits well above the bone origin/feet for
// our chars) lands near the canvas vertical center. Tuned for the default
// character proportions; works reasonably across the range.
const ORIGIN_Y_OFFSET = 170;
const BASE_SCALE = 2.5;

const VECTOR_HIT_PX = 10;
const JOINT_HIT_PX  = 14;

// Joints that stay rigid in pure ragdoll mode — preserves natural shoulder placement.
// Still draggable in Edit Structure (free positioning) and in Edit Animation
// (constrained to slight up/down shrug — see SHOULDER_Y_RANGE).
const RAGDOLL_LOCKED = new Set(['left_arm', 'right_arm']);

// Shoulders (joints 4 and 7) can shrug this many bone-local pixels up or down
// in Edit Animation mode. Larger ranges look dislocated.
const SHOULDER_BONES = new Set(['left_arm', 'right_arm']);
const SHOULDER_Y_RANGE = 6;

// Head (joint 2) can be tilted ±this many radians (~22°) in Edit Animation
// mode so the user can make the character look up or down without the head
// pivoting out of position. Drag direction around the head joint maps to
// rotation; the head's xy position is untouched.
const HEAD_ROT_RANGE = Math.PI * (22 / 180);

// Rotation handles for bones that have no IK rotation control of their own
// (upper arms — joints 4/7, and the head — joint 2). The handle sits at the
// given bone-local offset and dragging it sets the bone's rotation directly.
// Head handle sits above the head skin so the user can grab it like a
// hair tuft to tilt the face.
const ROTATE_HANDLES = [
  { boneId: 'left_arm',  lx: -12, ly:  0,  label: 'L' },
  { boneId: 'right_arm', lx:  12, ly:  0,  label: 'R' },
  { boneId: 'head',      lx:  0,  ly: -55, label: 'H' },
];


// ── Component ──────────────────────────────────────────────────────────────────
export const CharacterCanvas = forwardRef(function CharacterCanvas({
  character,
  boneOffsets:          initialBoneOffsets,
  skinOverrides:        initialSkinOverrides,
  defaultBoneOffsets:   initialDefaultBoneOffsets,
  defaultSkinOverrides: initialDefaultSkinOverrides,
  animBoneOffsets:      initialAnimBoneOffsets,
  animKeyframeOverrides: animKeyframeOverridesProp,
  activeKeyframe,
  onKeyframeOverrideChange,
  currentAnimation, isPlaying,
  showBones, showFrame, showVectors, ragdoll, editStructure, rebindMode, showBinds, selectedSkin,
  editAnimPose,
  customAnimations,
  onAnimationComplete,
  onBoneOffsetsChange,
  onSkinOverridesChange,
  onRagdollOverlayChange,
  onAnimBoneOffsetsChange,
  onSaveDefault,
  weaponOffset,
  onWeaponOffsetSet,
}, ref) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 868, h: 896 });

  // Reset targets (updated by "Save as Default")
  const defaultBoneOffsets  = useRef(initialDefaultBoneOffsets  ?? {});
  const defaultSkinOverrides = useRef(initialDefaultSkinOverrides ?? {});

  const [boneOffsets,    setBoneOffsets]    = useState(() => initialBoneOffsets   ?? {});
  const [skinOverrides,  setSkinOverrides]  = useState(() => initialSkinOverrides ?? {});
  // Ephemeral pose layer for ragdoll testing — never persisted, cleared when ragdoll toggles off.
  const [ragdollOverlay, setRagdollOverlay] = useState({});
  // Per-animation additive offsets — persisted, written when editAnimPose is active.
  const [animBoneOffsets, setAnimBoneOffsets] = useState(() => initialAnimBoneOffsets ?? {});
  const [zoomPct,        setZoomPct]        = useState(100);

  useImperativeHandle(ref, () => ({
    resetAnimBoneOffsets(animKey) {
      setAnimBoneOffsets(prev => {
        const { [animKey]: _, ...rest } = prev;
        return rest;
      });
    },
    seekTime(t) {
      stateRef.current.time = t;
      stateRef.current.lastTimestamp = null;
    },
    getCurrentTime() {
      return stateRef.current.time;
    },
  }));

  const dragRef    = useRef(null);
  const panDragRef = useRef(null);
  const viewRef    = useRef({ zoom: 1, panX: 0, panY: 0 });
  // Decoded HTMLImageElements for character body/head/weapon PNGs.
  // The hook handles cancellation so rapid weapon swaps don't race.
  const bodyImageRef   = useImageDataUrl(character?.bodyImage);
  // Per-animation head PNG override falls back to the base headImage. The
  // hook re-decodes whenever the URL string changes (e.g. when the user
  // switches between Idle / Carry / etc.).
  const resolvedHeadUrl = character?.animHeadImages?.[currentAnimation] ?? character?.headImage;
  const headImageRef   = useImageDataUrl(resolvedHeadUrl);
  const weaponImageRef = useImageDataUrl(character?.weaponImages?.[character?.weapon]);

  // Undo history — session-only, capped at 60 entries
  const historyRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  const stateRef = useRef({
    time: 0, lastTimestamp: null,
    currentAnimation, isPlaying, character,
    showBones, showFrame, showVectors, ragdoll, editStructure, rebindMode, showBinds, selectedSkin,
    editAnimPose: false,
    boneOffsets: {}, skinOverrides: {}, ragdollOverlay: {}, animBoneOffsets: {},
    lastWorldTransforms: null, lastAnimPose: {},
    vectorHitTargets: [],
    rotateHitTargets: [],
    weaponHitTargets: [],
    weaponOffset: { x: 0, y: 0, rotation: 0 },
    onWeaponOffsetSet: null,
    canvasW: 868, canvasH: 896, originX: 434, originY: 686,
  });

  stateRef.current.canvasW = canvasSize.w;
  stateRef.current.canvasH = canvasSize.h;
  stateRef.current.originX = canvasSize.w / 2;
  stateRef.current.originY = Math.round(canvasSize.h / 2 + ORIGIN_Y_OFFSET);

  stateRef.current.currentAnimation = currentAnimation;
  stateRef.current.isPlaying        = isPlaying;
  stateRef.current.character        = character;
  stateRef.current.showBones        = showBones;
  stateRef.current.showFrame        = showFrame;
  stateRef.current.showVectors      = showVectors;
  stateRef.current.ragdoll          = ragdoll;
  stateRef.current.editStructure    = editStructure;
  stateRef.current.rebindMode       = rebindMode;
  stateRef.current.showBinds        = showBinds;
  stateRef.current.selectedSkin     = selectedSkin;
  stateRef.current.editAnimPose     = editAnimPose;
  stateRef.current.boneOffsets      = boneOffsets;
  stateRef.current.skinOverrides    = skinOverrides;
  stateRef.current.ragdollOverlay   = ragdollOverlay;
  stateRef.current.animBoneOffsets  = animBoneOffsets;
  stateRef.current.customAnimations = customAnimations;
  stateRef.current.animKeyframeOverrides = animKeyframeOverridesProp ?? {};
  stateRef.current.activeKeyframe   = activeKeyframe ?? null;
  stateRef.current.weaponOffset     = weaponOffset ?? { x: 0, y: 0, rotation: 0 };
  stateRef.current.onWeaponOffsetSet = onWeaponOffsetSet ?? null;

  // When a keyframe row is clicked, snap to its time and lock there.
  useEffect(() => {
    if (activeKeyframe) {
      stateRef.current.time = activeKeyframe.time;
      stateRef.current.lastTimestamp = null;
    }
  }, [activeKeyframe?.boneId, activeKeyframe?.time]);

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
  useEffect(() => {
    if (firstRender.current) return;
    onAnimBoneOffsetsChange?.(animBoneOffsets);
  }, [animBoneOffsets]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { firstRender.current = false; }, []);

  useEffect(() => {
    stateRef.current.time = 0;
    stateRef.current.lastTimestamp = null;
  }, [currentAnimation]);

  // Drop the ephemeral ragdoll pose whenever ragdoll is turned off.
  useEffect(() => {
    if (!ragdoll) setRagdollOverlay(o => Object.keys(o).length === 0 ? o : {});
  }, [ragdoll]);

  // Re-center the sprite frame in the canvas whenever Edit Animation toggles.
  // Frame dimensions are baked here (same constants as the in-frame overlay).
  // We preserve the current zoom — just nudge pan so the frame's centre lands
  // on the canvas centre.
  const recenterInitialMountRef = useRef(true);
  useEffect(() => {
    if (recenterInitialMountRef.current) {
      recenterInitialMountRef.current = false;
      return;
    }
    const zoom  = viewRef.current.zoom;
    const scale = BASE_SCALE * zoom;
    viewRef.current = {
      zoom,
      panX: (FRAME_ORIGIN_X - FRAME_W / 2) * scale,
      panY: (FRAME_ORIGIN_Y - FRAME_H / 2) * scale - ORIGIN_Y_OFFSET,
    };
  }, [editAnimPose]);

  // (Body/head/weapon image decoding lives in useImageDataUrl above.)

  // ── Responsive sizing — backing buffer follows container size ─────────────────
  // We measure via getBoundingClientRect (CSS pixels) and observe the container.
  // ResizeObserver's contentRect can be misreported on some setups, so we read
  // clientWidth/Height explicitly on each tick.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const w = Math.max(100, Math.round(el.clientWidth));
      const h = Math.max(100, Math.round(el.clientHeight));
      setCanvasSize(prev => prev.w === w && prev.h === h ? prev : { w, h });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Wheel zoom ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e) => {
      e.preventDefault();
      const s      = stateRef.current;
      const rect   = canvas.getBoundingClientRect();
      const ratio  = s.canvasW / rect.width;
      const cx     = (e.clientX - rect.left) * ratio;
      const cy     = (e.clientY - rect.top)  * ratio;
      const { zoom, panX, panY } = viewRef.current;
      const originX = s.originX + panX, originY = s.originY + panY;
      const scale   = BASE_SCALE * zoom;
      const charX   = (cx - originX) / scale, charY = (cy - originY) / scale;
      const factor  = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(0.25, Math.min(12, zoom * factor));
      const ns      = BASE_SCALE * newZoom;
      viewRef.current = { zoom: newZoom, panX: cx - charX * ns - s.originX, panY: cy - charY * ns - s.originY };
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

    const rawAnim = s.customAnimations?.find(a => a.id === s.currentAnimation)
      ?? ANIMATIONS[s.currentAnimation];
    // Apply per-keyframe overrides for this animation.
    const anim = rawAnim
      ? resolveAnimation(rawAnim, (s.animKeyframeOverrides ?? {})[s.currentAnimation] ?? null)
      : null;
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
    const CANVAS_W = s.canvasW, CANVAS_H = s.canvasH;

    ctx.fillStyle = '#FFE699';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const { zoom, panX, panY } = viewRef.current;
    const originX = s.originX + panX, originY = s.originY + panY;
    const scale   = BASE_SCALE * zoom;

    // ── Character-local grid + coordinate labels ──────────────────────────────
    // Grid lines sit at multiples of GRID_STEP in CHARACTER-LOCAL units so
    // they stay anchored to the character as the user pans/zooms. The edge
    // labels (top: x, left: y) read out the underlying coordinates so the
    // user can position skin points / bones precisely.
    const GRID_STEP = 50;
    const xMin = (0          - originX) / scale;
    const xMax = (CANVAS_W   - originX) / scale;
    const yMin = (0          - originY) / scale;
    const yMax = (CANVAS_H   - originY) / scale;
    const xGridStart = Math.ceil (xMin / GRID_STEP) * GRID_STEP;
    const xGridEnd   = Math.floor(xMax / GRID_STEP) * GRID_STEP;
    const yGridStart = Math.ceil (yMin / GRID_STEP) * GRID_STEP;
    const yGridEnd   = Math.floor(yMax / GRID_STEP) * GRID_STEP;

    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    for (let x = xGridStart; x <= xGridEnd; x += GRID_STEP) {
      const cx = originX + x * scale;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, CANVAS_H); ctx.stroke();
    }
    for (let y = yGridStart; y <= yGridEnd; y += GRID_STEP) {
      const cy = originY + y * scale;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(CANVAS_W, cy); ctx.stroke();
    }

    // Axis emphasis at x=0 / y=0
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    if (originX >= 0 && originX <= CANVAS_W) {
      ctx.beginPath(); ctx.moveTo(originX, 0); ctx.lineTo(originX, CANVAS_H); ctx.stroke();
    }
    if (originY >= 0 && originY <= CANVAS_H) {
      ctx.beginPath(); ctx.moveTo(0, originY); ctx.lineTo(CANVAS_W, originY); ctx.stroke();
    }

    // Edge labels — sparser at low zoom so the numbers don't pile up.
    // Aim for at least ~50 canvas px between labels.
    const cellPx     = GRID_STEP * scale;
    const labelMul   = Math.max(1, Math.ceil(50 / cellPx));
    const labelStep  = GRID_STEP * labelMul;
    const xLabelStart = Math.ceil (xMin / labelStep) * labelStep;
    const xLabelEnd   = Math.floor(xMax / labelStep) * labelStep;
    const yLabelStart = Math.ceil (yMin / labelStep) * labelStep;
    const yLabelEnd   = Math.floor(yMax / labelStep) * labelStep;

    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = xLabelStart; x <= xLabelEnd; x += labelStep) {
      const cx = originX + x * scale;
      if (cx > 22 && cx < CANVAS_W - 4) ctx.fillText(`${x}`, cx, 2);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let y = yLabelStart; y <= yLabelEnd; y += labelStep) {
      const cy = originY + y * scale;
      if (cy > 10 && cy < CANVAS_H - 4) ctx.fillText(`${y}`, 4, cy);
    }

    ctx.save();
    ctx.translate(originX, originY + 6 * zoom);
    const sg = ctx.createRadialGradient(0, 0, 8, 0, 0, 70);
    sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.scale(zoom, zoom * 0.3);
    ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Ground line at the bottom of the sprite frame (world y = FRAME_H - FRAME_ORIGIN_Y).
    const groundY = originY + (FRAME_H - FRAME_ORIGIN_Y) * scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(60, groundY); ctx.lineTo(CANVAS_W - 60, groundY); ctx.stroke();

    const animPose         = anim ? getPoseAtTime(anim, s.time) : {};
    s.lastAnimPose         = animPose;
    const animSpecificOff  = (s.animBoneOffsets ?? {})[s.currentAnimation] ?? {};
    const persistentOffsets = mergeOffsets(mergeOffsets(s.boneOffsets, animSpecificOff), s.ragdollOverlay);
    const neckLen          = s.character?.neckLength;
    const neckOff          = neckLen != null ? { head: { y: Math.abs(BONES.head.localY) - neckLen } } : {};
    const fullPose         = mergeOffsets(mergeOffsets(animPose, persistentOffsets), neckOff);
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
      weaponImage:   weaponImageRef.current,
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

    if ((s.showBones || s.editAnimPose) && (s.ragdoll || s.editStructure || s.editAnimPose)) {
      ctx.save();
      ctx.translate(originX, originY);
      ctx.scale(scale, scale);
      const visualScale = 1 / zoom;
      // Enlarged so the letter label fits inside.
      const r = 5 * visualScale;
      const targets = [];
      for (const h of ROTATE_HANDLES) {
        const bone = worldTransforms[h.boneId];
        if (!bone) continue;
        const c = Math.cos(bone.rotation), sn = Math.sin(bone.rotation);
        const hx = bone.x + c * h.lx - sn * h.ly;
        const hy = bone.y + sn * h.lx + c * h.ly;
        const active = drag?.type === 'rotate' && drag.boneId === h.boneId;
        const rr = active ? r * 1.4 : r;
        ctx.lineWidth   = 0.8 * visualScale;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.fillStyle   = active ? '#FFFFFF' : '#FF66FF';
        ctx.beginPath();
        ctx.arc(hx, hy, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (h.label) {
          ctx.fillStyle = active ? '#000' : '#1a1a1a';
          ctx.font = `bold ${(rr * 1.25).toFixed(2)}px sans-serif`;
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(h.label, hx, hy + 0.2 * visualScale);
        }
        targets.push({ boneId: h.boneId, lx: h.lx, ly: h.ly, x: hx, y: hy });
      }
      s.rotateHitTargets = targets;
      ctx.restore();
    } else {
      s.rotateHitTargets = [];
    }

    // Weapon anchor + rotation handles (editAnimPose, weapon equipped)
    if (s.editAnimPose && s.character?.weapon && s.character.weapon !== 'none') {
      const hand = worldTransforms['right_hand'];
      if (hand) {
        const wo   = s.weaponOffset;
        const cosH = Math.cos(hand.rotation), sinH = Math.sin(hand.rotation);
        const wax  = hand.x + cosH * wo.x - sinH * wo.y;
        const way  = hand.y + sinH * wo.x + cosH * wo.y;
        const weaponWorldRot = hand.rotation + wo.rotation;
        const vs   = 1 / zoom;
        const drag = dragRef.current;
        const posActive = drag?.type === 'weapon-pos';
        const rotActive = drag?.type === 'weapon-rot';

        ctx.save();
        ctx.translate(originX, originY);
        ctx.scale(scale, scale);

        // Dashed line from weapon anchor to rotation handle
        const ROT_DIST = 20 * vs;
        const rhAngle  = weaponWorldRot - Math.PI / 2;
        const rhx = wax + Math.cos(rhAngle) * ROT_DIST;
        const rhy = way + Math.sin(rhAngle) * ROT_DIST;
        ctx.setLineDash([2 * vs, 2 * vs]);
        ctx.strokeStyle = rotActive ? 'rgba(255,150,50,0.9)' : 'rgba(255,150,50,0.5)';
        ctx.lineWidth   = vs;
        ctx.beginPath(); ctx.moveTo(wax, way); ctx.lineTo(rhx, rhy); ctx.stroke();
        ctx.setLineDash([]);

        // Rotation handle (orange circle)
        const rr = 3 * vs;
        ctx.fillStyle   = rotActive ? '#FFF' : '#FF9632';
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth   = vs;
        ctx.beginPath(); ctx.arc(rhx, rhy, rotActive ? rr * 1.4 : rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        // Position handle (gold circle + crosshair)
        const r = 4.5 * vs;
        ctx.fillStyle   = posActive ? '#FFF' : '#FFD700';
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.lineWidth   = vs;
        ctx.beginPath(); ctx.arc(wax, way, posActive ? r * 1.3 : r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth   = 0.7 * vs;
        const cr = r * 0.8;
        ctx.beginPath();
        ctx.moveTo(wax - cr, way); ctx.lineTo(wax + cr, way);
        ctx.moveTo(wax, way - cr); ctx.lineTo(wax, way + cr);
        ctx.stroke();

        ctx.restore();

        s.weaponHitTargets = [
          { type: 'weapon-pos', x: wax, y: way, wax, way },
          { type: 'weapon-rot', x: rhx, y: rhy, wax, way },
        ];
      } else {
        s.weaponHitTargets = [];
      }
    } else {
      s.weaponHitTargets = [];
    }

    if (s.showFrame) {
      // Sprite frame boundary — matches export.js constants (via spriteExportConfig.js).
      // FRAME_ORIGIN_X/Y is where world (0,0) sits inside the frame.
      const fl = originX - FRAME_ORIGIN_X * scale;
      const ft = originY - FRAME_ORIGIN_Y * scale;
      const fw = FRAME_W * scale;
      const fh = FRAME_H * scale;

      ctx.save();
      // Dim area outside the frame
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0,  0,  CANVAS_W, ft);           // above
      ctx.fillRect(0,  ft + fh, CANVAS_W, CANVAS_H);// below
      ctx.fillRect(0,  ft, fl, fh);                  // left
      ctx.fillRect(fl + fw, ft, CANVAS_W, fh);       // right

      // Frame border
      ctx.strokeStyle = 'rgba(255,195,50,0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(fl, ft, fw, fh);
      ctx.setLineDash([]);

      // Pivot crosshair at world origin
      ctx.strokeStyle = 'rgba(255,195,50,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(originX - 7, originY); ctx.lineTo(originX + 7, originY);
      ctx.moveTo(originX, originY - 7); ctx.lineTo(originX, originY + 7);
      ctx.stroke();

      // Dimension label
      ctx.fillStyle = 'rgba(255,195,50,0.85)';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${FRAME_W}×${FRAME_H}px`, fl + 5, ft + 15);
      ctx.restore();
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
    const s     = stateRef.current;
    const rect  = canvas.getBoundingClientRect();
    const ratio = s.canvasW / rect.width;
    const cx    = (e.clientX - rect.left) * ratio;
    const cy    = (e.clientY - rect.top)  * ratio;
    const { zoom, panX, panY } = viewRef.current;
    return {
      x: (cx - s.originX - panX) / (BASE_SCALE * zoom),
      y: (cy - s.originY - panY) / (BASE_SCALE * zoom),
    };
  }, []);

  const hitRadius = useCallback((screenPx) => {
    const canvas = canvasRef.current;
    if (!canvas) return screenPx;
    const s     = stateRef.current;
    const rect  = canvas.getBoundingClientRect();
    const ratio = s.canvasW / rect.width;
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
    // Weapon handles — checked before bone joints so the anchor doesn't get
    // swallowed by the right_hand joint when wo is near zero.
    if (wt && s.editAnimPose && s.character?.weapon && s.character.weapon !== 'none') {
      const r = hitRadius(JOINT_HIT_PX);
      let closest = null, minDist = r;
      for (const h of s.weaponHitTargets) {
        const d = Math.hypot(h.x - x, h.y - y);
        if (d < minDist) { minDist = d; closest = h; }
      }
      if (closest) return closest;
    }
    if (wt && (s.ragdoll || s.editStructure || s.editAnimPose)) {
      const r = hitRadius(JOINT_HIT_PX);
      // Rotation handles take priority over joints (smaller, drawn on top).
      let closestRot = null, minRotDist = r;
      for (const h of s.rotateHitTargets) {
        const d = Math.hypot(h.x - x, h.y - y);
        if (d < minRotDist) { minRotDist = d; closestRot = h; }
      }
      if (closestRot) return { type: 'rotate', boneId: closestRot.boneId, lx: closestRot.lx, ly: closestRot.ly };

      // Lock shoulders only in pure ragdoll mode. Edit Structure lets them be
      // dragged freely; Edit Animation lets them shrug (constrained in handler).
      const shouldersLocked = s.ragdoll && !s.editStructure && !s.editAnimPose;
      let closest = null, minDist = r;
      for (const [boneId, bone] of Object.entries(wt)) {
        if (shouldersLocked && RAGDOLL_LOCKED.has(boneId)) continue;
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
    const s0 = stateRef.current;
    if (s0.currentAnimation !== 'edit' && !s0.editAnimPose && !s0.ragdoll) return;

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
      dragRef.current = target.type === 'weapon-pos'
        ? { ...target, initCharX: charPos.x, initCharY: charPos.y }
        : target;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      e.preventDefault();
    } else if (e.ctrlKey && stateRef.current.currentAnimation === 'edit') {
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
      const ratio  = stateRef.current.canvasW / canvas.getBoundingClientRect().width;
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
      const s        = stateRef.current;
      const isActive = s.currentAnimation === 'edit' || s.editAnimPose || s.ragdoll;
      const hovered  = isActive ? findTarget(charPos) : null;
      const addMode  = s.currentAnimation === 'edit' && s.showVectors && s.selectedSkin !== 'all' && e.ctrlKey;
      if (canvasRef.current)
        canvasRef.current.style.cursor = hovered ? 'grab' : addMode ? 'crosshair' : 'default';
      return;
    }

    const s  = stateRef.current;
    const wt = s.lastWorldTransforms;
    if (!wt) return;

    if (drag.type === 'weapon-pos') {
      const hand = wt['right_hand'];
      if (!hand) return;
      const cosH = Math.cos(hand.rotation), sinH = Math.sin(hand.rotation);
      // Keep the grab point fixed under the cursor
      const desiredX = charPos.x - (drag.initCharX - drag.wax);
      const desiredY = charPos.y - (drag.initCharY - drag.way);
      const dx = desiredX - hand.x, dy = desiredY - hand.y;
      const newX = cosH * dx + sinH * dy;
      const newY = -sinH * dx + cosH * dy;
      const cur = s.weaponOffset;
      s.onWeaponOffsetSet?.({ ...cur, x: newX, y: newY });
      return;
    }

    if (drag.type === 'weapon-rot') {
      const hand = wt['right_hand'];
      if (!hand) return;
      const wo   = s.weaponOffset;
      const cosH = Math.cos(hand.rotation), sinH = Math.sin(hand.rotation);
      // Recompute anchor from current offset so rotation pivots correctly
      const wax = hand.x + cosH * wo.x - sinH * wo.y;
      const way = hand.y + sinH * wo.x + cosH * wo.y;
      const angle = Math.atan2(charPos.y - way, charPos.x - wax);
      // Handle sits at (weaponWorldRot - π/2) from anchor, so invert to get rotation
      s.onWeaponOffsetSet?.({ ...wo, rotation: angle + Math.PI / 2 - hand.rotation });
      return;
    }

    if (drag.type === 'rotate') {
      const armBone = wt[drag.boneId];
      if (!armBone) return;
      const parentDef = BONES[BONES[drag.boneId].parent];
      const pw = parentDef ? wt[parentDef.id] : { rotation: 0 };
      const cursorAngle     = Math.atan2(charPos.y - armBone.y, charPos.x - armBone.x);
      const handleRestAngle = Math.atan2(drag.ly, drag.lx);
      const desiredWorldRot = cursorAngle - handleRestAngle;
      const desiredLocalRot = desiredWorldRot - pw.rotation;
      let newRotation       = desiredLocalRot - BONES[drag.boneId].baseRotation;
      // Head tilt is limited to ±~22° so the character can look up/down
      // without spinning the head.
      if (drag.boneId === 'head') {
        // Normalize to ±π first so a wrap-around drag doesn't end up at +358°.
        while (newRotation >  Math.PI) newRotation -= 2 * Math.PI;
        while (newRotation < -Math.PI) newRotation += 2 * Math.PI;
        newRotation = Math.max(-HEAD_ROT_RANGE, Math.min(HEAD_ROT_RANGE, newRotation));
      }

      if (s.editStructure) {
        setBoneOffsets(prev => ({
          ...prev,
          [drag.boneId]: { ...(prev[drag.boneId] || {}), rotation: newRotation },
        }));
      } else if (s.editAnimPose) {
        setAnimBoneOffsets(prev => {
          const curAnimOff  = prev[s.currentAnimation] ?? {};
          const combined    = mergeOffsets(mergeOffsets(s.lastAnimPose, s.boneOffsets), curAnimOff);
          const curRot      = (combined[drag.boneId]?.rotation) || 0;
          const dr          = newRotation - curRot;
          if (Math.abs(dr) < 1e-9) return prev;
          const boneOff = curAnimOff[drag.boneId] ?? {};
          return {
            ...prev,
            [s.currentAnimation]: {
              ...curAnimOff,
              [drag.boneId]: { x: boneOff.x || 0, y: boneOff.y || 0, rotation: (boneOff.rotation || 0) + dr },
            },
          };
        });
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
      } else if (s.editAnimPose) {
        // IK against the full current pose (animPose + boneOffsets + animBoneOffsets)
        // so the drag feels natural.
        const curAnimOff   = s.animBoneOffsets[s.currentAnimation] ?? {};
        const combined     = mergeOffsets(mergeOffsets(s.lastAnimPose, s.boneOffsets), curAnimOff);
        const activeKf     = s.activeKeyframe;
        const animOvAll    = s.animKeyframeOverrides ?? {};
        const animOvForCur = animOvAll[s.currentAnimation] ?? {};
        const rawAnim      = s.customAnimations?.find(a => a.id === s.currentAnimation)
                           ?? ANIMATIONS[s.currentAnimation];

        // Shoulders (joints 4/7) get constrained-translate instead of pivot IK.
        // We only nudge the animBoneOffsets `y` of the shoulder, clamped to
        // ±SHOULDER_Y_RANGE around whatever the build / animation already has.
        // X is never touched — the shoulder stays attached at its build position.
        // Child bones (forearm/hand) ride along automatically since they're
        // parented to the shoulder.
        if (SHOULDER_BONES.has(drag.boneId)) {
          const torsoW   = wt['torso'];
          const shldW    = wt[drag.boneId];
          if (!torsoW || !shldW) return;
          // Cursor delta from current shoulder position, in torso-local frame.
          const dxW = charPos.x - shldW.x;
          const dyW = charPos.y - shldW.y;
          const cosT = Math.cos(torsoW.rotation), sinT = Math.sin(torsoW.rotation);
          const dyLocal = -sinT * dxW + cosT * dyW;

          // Pick the layer we're writing to and clamp THIS layer's y against the range.
          const writeKf = !!(activeKf && onKeyframeOverrideChange);
          const timeKey = writeKf ? keyframeTimeKey(activeKf.time) : null;
          const srcKf   = writeKf
            ? (rawAnim?.tracks?.[drag.boneId]?.find(k => keyframeTimeKey(k.time) === timeKey) ?? {})
            : null;
          const existingY = writeKf
            ? (animOvForCur[drag.boneId]?.[timeKey]?.y ?? srcKf.y ?? 0)
            : ((curAnimOff[drag.boneId] ?? {}).y || 0);

          const newY = Math.max(-SHOULDER_Y_RANGE,
                          Math.min(SHOULDER_Y_RANGE, existingY + dyLocal));
          if (Math.abs(newY - existingY) < 1e-6) return;

          if (writeKf) {
            const existing = animOvForCur[drag.boneId]?.[timeKey] ?? {};
            const oldRot = existing.rotation !== undefined ? existing.rotation : (srcKf.rotation ?? 0);
            const oldX   = existing.x        !== undefined ? existing.x        : (srcKf.x ?? 0);
            onKeyframeOverrideChange(s.currentAnimation, drag.boneId, activeKf.time, {
              rotation: oldRot,
              x: oldX,
              y: newY,
            });
          } else {
            setAnimBoneOffsets(prev => {
              const cur     = prev[s.currentAnimation] ?? {};
              const boneOff = cur[drag.boneId] ?? {};
              return {
                ...prev,
                [s.currentAnimation]: {
                  ...cur,
                  [drag.boneId]: {
                    x:        boneOff.x || 0,        // untouched
                    y:        newY,
                    rotation: boneOff.rotation || 0, // untouched
                  },
                },
              };
            });
          }
          return;
        }

        const next = solveIK(combined, drag.boneId, charPos.x, charPos.y);

        if (activeKf && onKeyframeOverrideChange) {
          // Active keyframe path: bake EVERY bone touched by the IK into the
          // override at activeKf.time so the curve actually deforms at that
          // one time point only. animBoneOffsets is left alone.
          const timeKey = keyframeTimeKey(activeKf.time);
          for (const id of Object.keys(next)) {
            const o  = combined[id] || {};
            const n  = next[id]     || {};
            const dx = (n.x        || 0) - (o.x        || 0);
            const dy = (n.y        || 0) - (o.y        || 0);
            const dr = (n.rotation || 0) - (o.rotation || 0);
            if (Math.abs(dx) <= 1e-9 && Math.abs(dy) <= 1e-9 && Math.abs(dr) <= 1e-9) continue;

            const existing = animOvForCur[id]?.[timeKey] ?? {};
            const srcKf    = rawAnim?.tracks?.[id]?.find(k => keyframeTimeKey(k.time) === timeKey) ?? {};
            const oldRot = existing.rotation !== undefined ? existing.rotation : (srcKf.rotation ?? 0);
            const oldX   = existing.x        !== undefined ? existing.x        : (srcKf.x        ?? 0);
            const oldY   = existing.y        !== undefined ? existing.y        : (srcKf.y        ?? 0);
            onKeyframeOverrideChange(s.currentAnimation, id, activeKf.time, {
              rotation: oldRot + dr,
              ...(Math.abs(dx) > 1e-9 ? { x: oldX + dx } : {}),
              ...(Math.abs(dy) > 1e-9 ? { y: oldY + dy } : {}),
            });
          }
        } else {
          // No active keyframe — fall back to time-invariant animBoneOffsets.
          const newAnimOff = { ...curAnimOff };
          for (const id of Object.keys(next)) {
            const o  = combined[id] || {};
            const n  = next[id]     || {};
            const dx = (n.x        || 0) - (o.x        || 0);
            const dy = (n.y        || 0) - (o.y        || 0);
            const dr = (n.rotation || 0) - (o.rotation || 0);
            if (Math.abs(dx) <= 1e-9 && Math.abs(dy) <= 1e-9 && Math.abs(dr) <= 1e-9) continue;
            const cur = newAnimOff[id] || {};
            newAnimOff[id] = {
              x:        (cur.x        || 0) + dx,
              y:        (cur.y        || 0) + dy,
              rotation: (cur.rotation || 0) + dr,
            };
          }
          setAnimBoneOffsets(prev => ({ ...prev, [s.currentAnimation]: newAnimOff }));
        }
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
    const s = stateRef.current;
    const { zoom, panX, panY } = viewRef.current;
    const cx = s.canvasW / 2, cy = s.canvasH / 2;
    const originX = s.originX + panX, originY = s.originY + panY;
    const scale   = BASE_SCALE * zoom;
    const charX   = (cx - originX) / scale, charY = (cy - originY) / scale;
    const newZoom  = Math.max(0.25, Math.min(12, zoom * factor));
    const newScale = BASE_SCALE * newZoom;
    viewRef.current = { zoom: newZoom, panX: cx - charX * newScale - s.originX, panY: cy - charY * newScale - s.originY };
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

  // ── Mirror / Copy ─────────────────────────────────────────────────────────────
  // negate=true  → Mirror (flip rotation sign, for a mirrored-pose silhouette)
  // negate=false → Copy   (preserve rotation, for duplicating the same pose)
  const copyLimb = useCallback((fromSide, limbType, negate) => {
    pushHistory();
    const pairs = limbType === 'legs'
      ? [['left_leg','right_leg'], ['left_shin','right_shin'], ['left_foot','right_foot']]
      : [['left_arm','right_arm'], ['left_forearm','right_forearm'], ['left_hand','right_hand']];

    const fromBones   = pairs.map(p => fromSide === 'left' ? p[0] : p[1]);
    const toBones     = pairs.map(p => fromSide === 'left' ? p[1] : p[0]);
    const boneIdMap   = Object.fromEntries(pairs.map(([l, r]) => fromSide === 'left' ? [l, r] : [r, l]));
    const fromSkinKey = fromSide === 'left'
      ? (limbType === 'legs' ? 'left_leg'  : 'left_arm')
      : (limbType === 'legs' ? 'right_leg' : 'right_arm');
    const toSkinKey   = fromSide === 'left'
      ? (limbType === 'legs' ? 'right_leg' : 'right_arm')
      : (limbType === 'legs' ? 'left_leg'  : 'left_arm');

    setBoneOffsets(prev => {
      const next = { ...prev };
      fromBones.forEach((fromId, i) => {
        const toId = toBones[i];
        const off  = prev[fromId];
        if (off) next[toId] = { x: off.x || 0, y: off.y || 0, rotation: negate ? -(off.rotation || 0) : (off.rotation || 0) };
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

  const mirrorLimb    = useCallback((side, type) => copyLimb(side, type, true),  [copyLimb]);
  const replicateLimb = useCallback((side, type) => copyLimb(side, type, false), [copyLimb]);

  const hasBoneEdits = JSON.stringify(boneOffsets)   !== JSON.stringify(defaultBoneOffsets.current);
  const hasSkinEdits = JSON.stringify(skinOverrides) !== JSON.stringify(defaultSkinOverrides.current);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="block w-full h-full"
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
}); // end forwardRef

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
