import { ANIMATIONS } from '../systems/AnimationSystem.js';

export function AnimationControls({
  currentAnimation,
  isPlaying,
  showBones,
  onAnimationChange,
  onPlayPause,
  onToggleBones,
}) {
  return (
    <div className="anim-controls">
      <div className="anim-selector">
        {Object.entries(ANIMATIONS).map(([key, anim]) => (
          <button
            key={key}
            className={`anim-btn ${currentAnimation === key ? 'active' : ''}`}
            onClick={() => onAnimationChange(key)}
          >
            {anim.name}
            {!anim.loop && <span className="tag">once</span>}
          </button>
        ))}
      </div>

      <div className="playback-row">
        <button className="play-btn" onClick={onPlayPause}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showBones}
            onChange={onToggleBones}
          />
          Show Bones
        </label>
      </div>
    </div>
  );
}
