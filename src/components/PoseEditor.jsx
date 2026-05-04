import { useEffect, useRef } from 'react';
import { computeWorldTransforms } from '../systems/SkeletonSystem.js';
import { renderCharacter } from '../systems/Renderer.js';
import { DEFAULT_SKINS, getSkin } from '../systems/VectorEditor.js';
import { mergeOffsets } from '../utils/transforms.js';

const THUMB_W      = 72;
const THUMB_H      = 110;
const THUMB_SCALE  = 0.47;
const THUMB_ORIGIN_X = THUMB_W / 2;
const THUMB_ORIGIN_Y = THUMB_H - 4;

function FrameThumb({ character, frame, skinOverrides, isActive, index, onClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, THUMB_W, THUMB_H);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, THUMB_W, THUMB_H);

    const fullPose       = mergeOffsets({}, frame.boneOffsets);
    const worldTransforms = computeWorldTransforms(fullPose);
    const skins = {};
    for (const key of Object.keys(DEFAULT_SKINS)) skins[key] = getSkin(key, skinOverrides);

    renderCharacter(ctx, character, worldTransforms, {
      originX:   THUMB_ORIGIN_X,
      originY:   THUMB_ORIGIN_Y,
      scale:     THUMB_SCALE,
      showBones: false,
      skins,
      animation: 'edit',
    });
  }, [character, frame.boneOffsets, skinOverrides]);

  return (
    <div
      className={`pose-frame-thumb${isActive ? ' active' : ''}`}
      onClick={onClick}
    >
      <canvas ref={canvasRef} width={THUMB_W} height={THUMB_H} />
      <div className="pose-frame-index">F{index + 1}</div>
    </div>
  );
}

export function PoseEditor({
  character,
  skinOverrides,
  frames,
  activeFrame,
  animName,
  animLoop,
  onFrameSelect,
  onFrameAdd,
  onFrameDelete,
  onFrameDuplicate,
  onFrameDurationChange,
  onNameChange,
  onLoopChange,
  onCreate,
  onClose,
}) {
  const totalDuration = frames.reduce((s, f) => s + f.duration, 0);

  return (
    <div className="pose-editor">
      <div className="pose-editor-header">
        <span className="pose-editor-title">Pose Editor</span>

        <input
          className="pose-name-input"
          value={animName}
          onChange={e => onNameChange(e.target.value)}
          placeholder="Animation name"
          spellCheck={false}
        />

        <label className="toggle-label">
          <input
            type="checkbox"
            checked={animLoop}
            onChange={e => onLoopChange(e.target.checked)}
          />
          Loop
        </label>

        <span className="pose-total-duration">{totalDuration.toFixed(1)}s total</span>

        <div style={{ flex: 1 }} />

        <button className="pose-create-btn" onClick={onCreate}>
          Create Animation
        </button>
        <button className="pose-cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </div>

      <div className="pose-frame-strip">
        {frames.map((frame, i) => (
          <div key={frame.id} className="pose-frame-slot">
            <FrameThumb
              character={character}
              frame={frame}
              skinOverrides={skinOverrides}
              isActive={i === activeFrame}
              index={i}
              onClick={() => onFrameSelect(i)}
            />
            <div className="pose-frame-footer">
              <input
                type="number"
                className="pose-duration-input"
                value={frame.duration}
                min={0.05}
                max={10}
                step={0.05}
                onChange={e => onFrameDurationChange(i, parseFloat(e.target.value) || 0.1)}
              />
              <span className="pose-duration-unit">s</span>
              <button
                className="pose-frame-btn"
                title="Duplicate frame"
                onClick={() => onFrameDuplicate(i)}
              >
                ⧉
              </button>
              {frames.length > 1 && (
                <button
                  className="pose-frame-btn pose-frame-btn-del"
                  title="Delete frame"
                  onClick={() => onFrameDelete(i)}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}

        <button className="pose-add-frame-btn" onClick={onFrameAdd} title="Add frame">
          +
        </button>
      </div>

      <div className="pose-editor-hint">
        Drag joints in the canvas to pose each frame · Pose is saved when switching frames
      </div>
    </div>
  );
}
