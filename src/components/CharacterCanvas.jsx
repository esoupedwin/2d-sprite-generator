import { useEffect, useRef, useCallback, useState } from 'react';
import { ANIMATIONS, getPoseAtTime } from '../systems/AnimationSystem.js';
import { BONES, computeWorldTransforms } from '../systems/SkeletonSystem.js';
import { renderCharacter } from '../systems/Renderer.js';

const CANVAS_W         = 620;
const CANVAS_H         = 640;
const CHAR_ORIGIN_X    = CANVAS_W / 2;
const CHAR_ORIGIN_Y    = 490;
const CHAR_SCALE       = 2.5;
const JOINT_HIT_RADIUS = 10; // character-local units (~25px on screen)
const STORAGE_KEY      = '2dsprite:boneOffsets';

/**
 * Combines permanent bone-position offsets (from dragging) with the
 * current animation pose (rotation + transient offsets).
 */
function mergeOffsets(pose, boneOffsets) {
  const result = {};
  const ids = new Set([...Object.keys(pose), ...Object.keys(boneOffsets)]);
  for (const id of ids) {
    const p = pose[id] || {};
    const o = boneOffsets[id] || {};
    result[id] = {
      x:        (o.x || 0) + (p.x || 0),
      y:        (o.y || 0) + (p.y || 0),
      rotation: p.rotation || 0,
    };
  }
  return result;
}

function loadOffsets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOffsets(offsets) {
  try {
    if (Object.keys(offsets).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets));
    }
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function CharacterCanvas({
  character,
  currentAnimation,
  isPlaying,
  showBones,
  onAnimationComplete,
}) {
  const canvasRef = useRef(null);

  // Permanent per-bone position overrides set by dragging
  const [boneOffsets, setBoneOffsets] = useState(loadOffsets);

  // Drag state — kept in a ref so RAF loop always sees current value
  const dragRef = useRef({ boneId: null });

  const stateRef = useRef({
    time: 0,
    lastTimestamp: null,
    currentAnimation,
    isPlaying,
    character,
    showBones,
    boneOffsets: {},
    lastWorldTransforms: null,
  });

  // Keep ref in sync on every render without re-creating the RAF loop
  stateRef.current.currentAnimation = currentAnimation;
  stateRef.current.isPlaying        = isPlaying;
  stateRef.current.character        = character;
  stateRef.current.showBones        = showBones;
  stateRef.current.boneOffsets      = boneOffsets;

  // Persist to localStorage whenever offsets change
  useEffect(() => {
    saveOffsets(boneOffsets);
  }, [boneOffsets]);

  // Reset time when animation changes
  useEffect(() => {
    stateRef.current.time = 0;
    stateRef.current.lastTimestamp = null;
  }, [currentAnimation]);

  const resetOffsets = useCallback(() => {
    setBoneOffsets({});
  }, []);

  const drawFrame = useCallback((timestamp) => {
    const s = stateRef.current;

    if (s.lastTimestamp === null) s.lastTimestamp = timestamp;
    const delta = Math.min((timestamp - s.lastTimestamp) / 1000, 0.05);
    s.lastTimestamp = timestamp;

    const anim = ANIMATIONS[s.currentAnimation];

    if (anim && s.isPlaying) {
      s.time += delta;
      if (anim.loop) {
        s.time %= anim.duration;
      } else if (s.time >= anim.duration) {
        s.time = anim.duration;
        onAnimationComplete?.(s.currentAnimation);
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Shadow ellipse
    ctx.save();
    ctx.translate(CHAR_ORIGIN_X, CHAR_ORIGIN_Y + 6);
    const shadowGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 70);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.45)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.scale(1, 0.3);
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ground line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, CHAR_ORIGIN_Y + 2);
    ctx.lineTo(CANVAS_W - 60, CHAR_ORIGIN_Y + 2);
    ctx.stroke();

    // Merge animation pose + drag offsets, then compute world transforms once
    const animPose        = anim ? getPoseAtTime(anim, s.time) : {};
    const fullPose        = mergeOffsets(animPose, s.boneOffsets);
    const worldTransforms = computeWorldTransforms(fullPose);
    s.lastWorldTransforms = worldTransforms; // used by mouse handlers

    renderCharacter(ctx, s.character, worldTransforms, {
      originX:       CHAR_ORIGIN_X,
      originY:       CHAR_ORIGIN_Y,
      scale:         CHAR_SCALE,
      showBones:     s.showBones,
      highlightBone: dragRef.current.boneId,
    });

    // Animation name overlay
    if (anim) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '12px monospace';
      ctx.fillText(`${anim.name}  ${s.time.toFixed(2)}s / ${anim.duration.toFixed(2)}s`, 12, 20);
    }
  }, [onAnimationComplete]);

  useEffect(() => {
    let rafId;
    const loop = (timestamp) => {
      drawFrame(timestamp);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [drawFrame]);

  // ── Mouse interaction ──────────────────────────────────────────────────────

  /** Convert a mouse event to character-local coordinates. */
  const getCharPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const cy = (e.clientY - rect.top)  * (CANVAS_H / rect.height);
    return {
      x: (cx - CHAR_ORIGIN_X) / CHAR_SCALE,
      y: (cy - CHAR_ORIGIN_Y) / CHAR_SCALE,
    };
  }, []);

  /** Return the boneId of the joint closest to a character-local point, or null. */
  const findJointAt = useCallback(({ x, y }) => {
    const wt = stateRef.current.lastWorldTransforms;
    if (!wt) return null;
    let closest = null;
    let minDist  = JOINT_HIT_RADIUS;
    for (const [boneId, bone] of Object.entries(wt)) {
      const d = Math.hypot(bone.x - x, bone.y - y);
      if (d < minDist) { minDist = d; closest = boneId; }
    }
    return closest;
  }, []);

  const handleMouseDown = useCallback((e) => {
    const charPos = getCharPos(e);
    const boneId  = findJointAt(charPos);
    if (boneId) {
      dragRef.current.boneId = boneId;
      canvasRef.current.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }, [getCharPos, findJointAt]);

  const handleMouseMove = useCallback((e) => {
    const charPos = getCharPos(e);

    if (!dragRef.current.boneId) {
      // Hover feedback — show grab cursor near joints
      const hovered = findJointAt(charPos);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hovered ? 'grab' : 'default';
      }
      return;
    }

    const boneId = dragRef.current.boneId;
    const bone   = BONES[boneId];
    const wt     = stateRef.current.lastWorldTransforms;
    if (!wt) return;

    // Compute the local-space offset that places the joint under the cursor.
    // For child bones: inverse-rotate the world-space delta into parent-local space.
    let newOffX, newOffY;
    if (!bone.parent) {
      newOffX = charPos.x - bone.localX;
      newOffY = charPos.y - bone.localY;
    } else {
      const parent = wt[bone.parent];
      const cos    = Math.cos(parent.rotation);
      const sin    = Math.sin(parent.rotation);
      const dx     = charPos.x - parent.x;
      const dy     = charPos.y - parent.y;
      newOffX = cos * dx + sin * dy - bone.localX;
      newOffY = -sin * dx + cos * dy - bone.localY;
    }

    setBoneOffsets(prev => ({ ...prev, [boneId]: { x: newOffX, y: newOffY } }));
  }, [getCharPos, findJointAt]);

  const stopDrag = useCallback(() => {
    dragRef.current.boneId = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, []);

  const hasOffsets = Object.keys(boneOffsets).length > 0;

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
      />
      {hasOffsets && (
        <button
          onClick={resetOffsets}
          style={{
            position:     'absolute',
            top:          10,
            right:        10,
            padding:      '4px 10px',
            fontSize:     '11px',
            fontFamily:   'monospace',
            background:   'rgba(255, 80, 80, 0.85)',
            color:        '#fff',
            border:       'none',
            borderRadius: '4px',
            cursor:       'pointer',
            backdropFilter: 'blur(4px)',
          }}
        >
          Reset joints
        </button>
      )}
    </div>
  );
}
