import { useEffect, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

export function WeaponUploadDialog({ open, onClose, onPick, currentImage, weaponType = 'sword' }) {
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { onPick(reader.result); onClose(); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weapon-upload-title"
        className="relative w-[440px] max-w-[92vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="weapon-upload-title" className="text-sm font-semibold text-foreground">
            Upload Weapon PNG
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Draw your {
              weaponType === 'rifle' ? 'rifle'
              : weaponType === 'rocket' ? 'rocket launcher'
              : weaponType === 'grenade_launcher' ? 'grenade launcher'
              : weaponType === 'pistol' ? 'pistol'
              : 'weapon'
            } with the
            <strong className="text-foreground"> {weaponType === 'rifle' || weaponType === 'rocket' || weaponType === 'grenade_launcher' || weaponType === 'pistol' ? 'muzzle' : 'tip'} pointing UP</strong> and the
            <strong className="text-foreground"> {
              weaponType === 'rifle' ? 'stock'
              : weaponType === 'rocket' ? 'back-blast vent'
              : weaponType === 'grenade_launcher' ? 'folding stock'
              : weaponType === 'pistol' ? 'grip'
              : 'handle'
            } at the bottom-center</strong> of the image.
            The renderer rotates and anchors the PNG so the {
              weaponType === 'rifle' ? 'stock'
              : weaponType === 'rocket' ? 'grip'
              : weaponType === 'grenade_launcher' ? 'pistol grip'
              : weaponType === 'pistol' ? 'grip'
              : 'handle'
            } lands in the hand
            and the {weaponType === 'rifle' || weaponType === 'rocket' || weaponType === 'grenade_launcher' || weaponType === 'pistol' ? 'barrel' : 'tip'} extends along the weapon's forward direction.
          </p>

          <div className="flex items-center justify-center gap-6 py-2 bg-secondary/40 rounded-md border border-border">
            <OrientationDiagram weaponType={weaponType} />
            {currentImage && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Current</span>
                <img
                  src={currentImage}
                  alt="Current weapon"
                  className="max-w-[100px] max-h-[120px] object-contain rounded border border-border bg-background/40"
                />
              </div>
            )}
          </div>

          <ul className="text-[11px] text-muted-foreground/80 list-disc list-inside space-y-0.5">
            <li>Transparent PNG recommended.</li>
            <li>Longest side scales to ~80 units; fine-tune with the size and offset controls.</li>
            <li>Square or tall PNGs work best — the handle anchors at the image bottom-center.</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Choose PNG…
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handlePick}
          />
        </div>
      </div>
    </div>
  );
}

// Small SVG diagram: weapon outline pointing up with arrows + labels.
function OrientationDiagram({ weaponType }) {
  return (
    <svg width="110" height="150" viewBox="0 0 110 150" className="select-none">
      {/* Image frame */}
      <rect x="10" y="10" width="90" height="130" fill="none" stroke="rgb(82, 82, 91)" strokeWidth="1" strokeDasharray="3 3" rx="3" />

      {/* "UP" arrow on the left */}
      <line x1="4" y1="135" x2="4" y2="20" stroke="rgb(45, 212, 191)" strokeWidth="1.5" />
      <polygon points="1,25 4,18 7,25" fill="rgb(45, 212, 191)" />
      <text x="4" y="148" fontSize="9" fill="rgb(45, 212, 191)" textAnchor="middle" fontFamily="monospace">UP</text>

      {weaponType === 'rifle'  && <RifleSilhouette />}
      {weaponType === 'rocket' && <RocketSilhouette />}
      {weaponType === 'grenade_launcher' && <GrenadeLauncherSilhouette />}
      {weaponType === 'pistol' && <PistolSilhouette />}
      {(weaponType === 'sword' || !['rifle', 'rocket', 'grenade_launcher', 'pistol'].includes(weaponType)) && <SwordSilhouette />}

      {/* Tip / handle callouts (shared across weapon types) */}
      <line x1="68" y1="26" x2="84" y2="26" stroke="rgb(113, 113, 122)" strokeWidth="1" />
      <text x="86" y="29" fontSize="9" fill="rgb(212, 212, 216)" fontFamily="monospace">
        {weaponType === 'rifle' || weaponType === 'rocket' || weaponType === 'grenade_launcher' || weaponType === 'pistol' ? 'muzzle' : 'tip'}
      </text>

      <line x1="68" y1="120" x2="84" y2="120" stroke="rgb(113, 113, 122)" strokeWidth="1" />
      <text x="86" y="123" fontSize="9" fill="rgb(212, 212, 216)" fontFamily="monospace">
        {weaponType === 'rifle' ? 'stock' : weaponType === 'rocket' ? 'back-blast' : weaponType === 'grenade_launcher' ? 'stock' : weaponType === 'pistol' ? 'grip' : 'handle'}
      </text>
    </svg>
  );
}

function SwordSilhouette() {
  return (
    <g>
      <polygon points="55,20 50,32 60,32" fill="rgb(212, 212, 216)" />
      <rect x="51" y="32" width="8" height="58" fill="rgb(212, 212, 216)" />
      <rect x="42" y="88" width="26" height="6" fill="rgb(180, 140, 60)" />
      <rect x="51" y="94" width="8" height="22" fill="rgb(120, 80, 40)" />
      <circle cx="55" cy="120" r="5" fill="rgb(180, 140, 60)" />
    </g>
  );
}

function RifleSilhouette() {
  // Vertical rifle: muzzle at top, stock at bottom.
  return (
    <g>
      {/* Muzzle */}
      <rect x="51" y="20" width="8" height="6" fill="rgb(40, 40, 40)" />
      {/* Front sight */}
      <rect x="59" y="28" width="3" height="4" fill="rgb(60, 60, 60)" />
      {/* Barrel */}
      <rect x="52" y="26" width="6" height="40" fill="rgb(30, 30, 30)" />
      {/* Handguard */}
      <rect x="48" y="40" width="14" height="20" fill="rgb(100, 70, 40)" />
      {/* Receiver */}
      <rect x="46" y="66" width="18" height="14" fill="rgb(50, 50, 50)" />
      {/* Magazine */}
      <rect x="40" y="78" width="10" height="14" fill="rgb(35, 35, 35)" />
      {/* Trigger guard */}
      <circle cx="55" cy="82" r="3" fill="none" stroke="rgb(80, 80, 80)" strokeWidth="1.2" />
      {/* Pistol grip */}
      <rect x="52" y="86" width="6" height="12" fill="rgb(80, 55, 30)" />
      {/* Stock */}
      <polygon points="48,98 64,98 66,124 50,124" fill="rgb(110, 75, 40)" />
      <rect x="50" y="124" width="14" height="4" fill="rgb(60, 40, 20)" />
    </g>
  );
}

function GrenadeLauncherSilhouette() {
  // Vertical M32-style grenade launcher: short stubby muzzle on top,
  // big revolving drum in the middle, pistol grip + folding stock at bottom.
  return (
    <g>
      {/* Muzzle ring */}
      <rect x="49" y="20" width="12" height="4" fill="rgb(40, 40, 40)" />
      {/* Stubby barrel */}
      <rect x="51" y="24" width="8" height="14" fill="rgb(34, 34, 34)" />
      {/* Cylinder drum */}
      <ellipse cx="55" cy="52" rx="14" ry="15" fill="rgb(54, 54, 54)" stroke="rgb(20, 20, 20)" strokeWidth="1.2" />
      {/* Drum chamber dots */}
      <circle cx="49" cy="46" r="2.2" fill="rgb(10, 10, 10)" />
      <circle cx="55" cy="42" r="2.2" fill="rgb(10, 10, 10)" />
      <circle cx="61" cy="46" r="2.2" fill="rgb(10, 10, 10)" />
      <circle cx="49" cy="58" r="2.2" fill="rgb(10, 10, 10)" />
      <circle cx="55" cy="62" r="2.2" fill="rgb(10, 10, 10)" />
      <circle cx="61" cy="58" r="2.2" fill="rgb(10, 10, 10)" />
      {/* Drum hub */}
      <circle cx="55" cy="52" r="2" fill="rgb(120, 120, 120)" />
      {/* Receiver block */}
      <rect x="50" y="67" width="12" height="10" fill="rgb(46, 46, 46)" />
      {/* Trigger guard */}
      <circle cx="56" cy="80" r="3" fill="none" stroke="rgb(80, 80, 80)" strokeWidth="1.2" />
      {/* Pistol grip */}
      <rect x="53" y="84" width="6" height="12" fill="rgb(92, 69, 48)" />
      {/* Folding skeleton stock */}
      <rect x="51" y="96" width="2" height="22" fill="rgb(50, 50, 50)" />
      <rect x="59" y="96" width="2" height="22" fill="rgb(50, 50, 50)" />
      {/* Butt pad */}
      <rect x="49" y="118" width="14" height="5" fill="rgb(30, 30, 30)" />
    </g>
  );
}

function PistolSilhouette() {
  // Compact one-handed pistol: muzzle at top, grip at bottom.
  return (
    <g>
      {/* Muzzle crown */}
      <rect x="49" y="20" width="12" height="4" fill="rgb(40, 40, 40)" />
      {/* Barrel tip */}
      <rect x="51" y="24" width="8" height="10" fill="rgb(25, 25, 25)" />
      {/* Slide body */}
      <rect x="47" y="34" width="16" height="36" fill="rgb(46, 46, 46)" />
      {/* Slide serrations near rear */}
      <rect x="47" y="60" width="2" height="5" fill="rgb(28, 28, 28)" />
      <rect x="61" y="60" width="2" height="5" fill="rgb(28, 28, 28)" />
      {/* Front sight nub */}
      <rect x="54" y="36" width="2" height="3" fill="rgb(80, 80, 80)" />
      {/* Rear sight */}
      <rect x="48" y="68" width="14" height="4" fill="rgb(28, 28, 28)" />
      {/* Trigger guard */}
      <path d="M 51 74 Q 50 82 55 82 Q 60 82 59 74" fill="none" stroke="rgb(60, 60, 60)" strokeWidth="1.5" />
      {/* Grip frame */}
      <rect x="50" y="74" width="10" height="38" rx="2" fill="rgb(74, 53, 32)" />
      {/* Magazine base */}
      <rect x="49" y="112" width="12" height="5" fill="rgb(40, 40, 40)" />
    </g>
  );
}

function RocketSilhouette() {
  // Vertical rocket launcher: warhead/muzzle at top, back-blast vent at
  // bottom, fat tube body, pistol grip on the side near the bottom.
  return (
    <g>
      {/* Warhead nose ring */}
      <rect x="46" y="20" width="18" height="6" fill="rgb(40, 40, 40)" />
      {/* Hazard band */}
      <rect x="48" y="26" width="14" height="6" fill="rgb(185, 74, 42)" />
      {/* Tube body */}
      <rect x="46" y="32" width="18" height="68" fill="rgb(58, 58, 58)" />
      {/* Top highlight */}
      <rect x="48" y="34" width="2" height="64" fill="rgb(150, 150, 150)" />
      {/* Carry handle on top */}
      <rect x="51" y="60" width="8" height="4" fill="rgb(30, 30, 30)" />
      {/* Rear back-blast collar */}
      <rect x="44" y="100" width="22" height="8" fill="rgb(20, 20, 20)" />
      {/* Pistol grip */}
      <rect x="40" y="86" width="6" height="14" fill="rgb(120, 80, 40)" />
    </g>
  );
}

