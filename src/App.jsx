import { useState, useCallback } from 'react';
import { CharacterCanvas } from './components/CharacterCanvas.jsx';
import { CharacterBuilder } from './components/CharacterBuilder.jsx';
import { AnimationControls } from './components/AnimationControls.jsx';
import { DEFAULT_CHARACTER } from './data/characterParts.js';
import { exportSpriteSheet, exportAnimationJSON } from './utils/export.js';

export default function App() {
  const [character, setCharacter] = useState(DEFAULT_CHARACTER);
  const [currentAnimation, setCurrentAnimation] = useState('idle');
  const [isPlaying, setIsPlaying] = useState(true);
  const [showBones, setShowBones] = useState(false);

  const updatePart = useCallback((partKey, optionKey) => {
    setCharacter(prev => ({ ...prev, [partKey]: optionKey }));
  }, []);

  // When a one-shot animation (attack) finishes, return to idle
  const handleAnimationComplete = useCallback((animName) => {
    if (animName === 'attack' || animName === 'jump') {
      setCurrentAnimation('idle');
    }
  }, []);

  const handleAnimationChange = useCallback((key) => {
    setCurrentAnimation(key);
    setIsPlaying(true);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>2D Character Generator</h1>
        <p className="subtitle">Skeletal animation · Modular parts · Export ready</p>
      </header>

      <div className="app-body">
        <CharacterBuilder character={character} onPartChange={updatePart} />

        <main className="center-panel">
          <div className="canvas-wrapper">
            <CharacterCanvas
              character={character}
              currentAnimation={currentAnimation}
              isPlaying={isPlaying}
              showBones={showBones}
              onAnimationComplete={handleAnimationComplete}
            />
          </div>

          <AnimationControls
            currentAnimation={currentAnimation}
            isPlaying={isPlaying}
            showBones={showBones}
            onAnimationChange={handleAnimationChange}
            onPlayPause={() => setIsPlaying(p => !p)}
            onToggleBones={() => setShowBones(p => !p)}
          />

          <div className="export-row">
            <span className="export-label">Export:</span>
            <button
              className="export-btn"
              onClick={() => exportSpriteSheet(character, currentAnimation)}
            >
              Sprite Sheet (PNG)
            </button>
            <button
              className="export-btn"
              onClick={() => exportAnimationJSON(currentAnimation)}
            >
              Animation Data (JSON)
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
