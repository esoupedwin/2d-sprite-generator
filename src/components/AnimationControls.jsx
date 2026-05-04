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
  customAnimations,
  poseEditorOpen,
  onAnimationChange,
  onPlayPause,
  onToggleBones,
  onToggleVectors,
  onToggleRagdoll,
  onToggleEditStructure,
  onSkinChange,
  onNewAnimation,
  onDeleteAnimation,
}) {
  return (
    <div className="anim-controls">
      <div className="anim-selector">
        {Object.entries(ANIMATIONS).map(([key, anim]) => (
          <button
            key={key}
            className={`anim-btn ${currentAnimation === key ? 'active' : ''}`}
            onClick={() => onAnimationChange(key)}
            disabled={poseEditorOpen}
          >
            {anim.name}
            {!anim.loop && <span className="tag">once</span>}
          </button>
        ))}

        {customAnimations?.length > 0 && (
          <div className="custom-anim-divider" />
        )}

        {customAnimations?.map(anim => (
          <div key={anim.id} className="custom-anim-row">
            <button
              className={`anim-btn ${currentAnimation === anim.id ? 'active' : ''}`}
              onClick={() => onAnimationChange(anim.id)}
              disabled={poseEditorOpen}
            >
              {anim.name}
              {!anim.loop && <span className="tag">once</span>}
            </button>
            <button
              className="custom-anim-delete"
              onClick={() => onDeleteAnimation(anim.id)}
              title="Delete animation"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        className={`new-anim-btn${poseEditorOpen ? ' active' : ''}`}
        onClick={onNewAnimation}
      >
        {poseEditorOpen ? 'Editing Animation...' : '+ New Animation'}
      </button>

      <div className="playback-row">
        <button className="play-btn" onClick={onPlayPause} disabled={poseEditorOpen}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <label className="toggle-label">
          <input type="checkbox" checked={showBones} onChange={onToggleBones} />
          Show Bones
        </label>

        {(() => {
          const isEdit = currentAnimation === 'edit';
          const dimStyle = (!isEdit || poseEditorOpen) ? { opacity: 0.35, cursor: 'not-allowed' } : {};
          const dimTitle = !isEdit ? 'Switch to Edit mode' : poseEditorOpen ? 'Close pose editor first' : '';
          return (
            <>
              <label className="toggle-label" style={dimStyle} title={dimTitle}>
                <input type="checkbox" checked={ragdoll} onChange={onToggleRagdoll} disabled={!isEdit || poseEditorOpen} />
                Ragdoll
              </label>
              <label className="toggle-label" style={dimStyle} title={dimTitle}>
                <input type="checkbox" checked={editStructure || poseEditorOpen} onChange={onToggleEditStructure} disabled={!isEdit || poseEditorOpen} />
                Edit Structure
              </label>
              <label className="toggle-label" style={dimStyle} title={dimTitle}>
                <input type="checkbox" checked={showVectors} onChange={onToggleVectors} disabled={!isEdit || poseEditorOpen} />
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
