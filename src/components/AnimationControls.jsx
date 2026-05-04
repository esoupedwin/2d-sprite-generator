import { ANIMATIONS } from '../systems/AnimationSystem.js';
import { SKIN_COLORS } from '../systems/VectorEditor.js';

const SKIN_OPTIONS = [
  { key: 'all', label: 'All' },
  ...Object.entries(SKIN_COLORS).map(([key, c]) => ({ key, label: c.label, color: c.anchor })),
];

export function AnimationControls({
  currentAnimation,
  isPlaying,
  showBones,
  showVectors,
  ragdoll,
  editStructure,
  selectedSkin,
  onAnimationChange,
  onPlayPause,
  onToggleBones,
  onToggleVectors,
  onToggleRagdoll,
  onToggleEditStructure,
  onSkinChange,
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
          <input type="checkbox" checked={showBones} onChange={onToggleBones} />
          Show Bones
        </label>

        {(() => {
          const isEdit = currentAnimation === 'edit';
          const dimStyle = !isEdit ? { opacity: 0.35, cursor: 'not-allowed' } : {};
          const dimTitle = !isEdit ? 'Switch to Edit mode' : '';
          return (
            <>
              <label className="toggle-label" style={dimStyle} title={dimTitle}>
                <input type="checkbox" checked={ragdoll} onChange={onToggleRagdoll} disabled={!isEdit} />
                Ragdoll
              </label>
              <label className="toggle-label" style={dimStyle} title={dimTitle}>
                <input type="checkbox" checked={editStructure} onChange={onToggleEditStructure} disabled={!isEdit} />
                Edit Structure
              </label>
              <label className="toggle-label" style={dimStyle} title={dimTitle}>
                <input type="checkbox" checked={showVectors} onChange={onToggleVectors} disabled={!isEdit} />
                Edit Vectors
              </label>
            </>
          );
        })()}
      </div>

      {/* Part selector — visible only in vector edit mode */}
      {showVectors && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Edit:
          </span>
          {SKIN_OPTIONS.map(({ key, label, color }) => (
            <button
              key={key}
              className={`anim-btn ${selectedSkin === key ? 'active' : ''}`}
              style={selectedSkin !== key && color ? { borderColor: color + '66' } : {}}
              onClick={() => onSkinChange(key)}
            >
              {color && (
                <span style={{
                  display: 'inline-block', width: 8, height: 8,
                  borderRadius: '50%', background: color, marginRight: 4,
                }} />
              )}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
