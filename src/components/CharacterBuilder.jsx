import { CHARACTER_PARTS } from '../data/characterParts.js';

export function CharacterBuilder({ character, onPartChange }) {
  return (
    <aside className="builder-panel">
      <h2>Character Builder</h2>
      {Object.entries(CHARACTER_PARTS).map(([partKey, partDef]) => (
        <PartSelector
          key={partKey}
          partKey={partKey}
          partDef={partDef}
          selected={character[partKey]}
          onChange={(val) => onPartChange(partKey, val)}
        />
      ))}
    </aside>
  );
}

function PartSelector({ partDef, selected, onChange }) {
  return (
    <section className="builder-section">
      <h3>{partDef.label}</h3>
      <div className="option-row wrap">
        {Object.entries(partDef.options).map(([key, opt]) => (
          <button
            key={key}
            className={`option-btn ${selected === key ? 'active' : ''}`}
            onClick={() => onChange(key)}
            title={opt.label}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}
