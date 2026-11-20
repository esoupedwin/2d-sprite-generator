import { useEffect, useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import { renderPosePreviewBase, composePose, poseSVGMarkup, downloadPoseSVG, downloadPosePNG, poseCardColorFor } from '../utils/export.js';

const OUTLINE_MIN = 1, OUTLINE_MAX = 24, OUTLINE_STEP = 1;
const CARD_SIZE_MIN = 0.5, CARD_SIZE_MAX = 2, CARD_SIZE_STEP = 0.05;

// What the dialog opens with every time: a black outline, a white band and a
// thin black rim around it, on the blue card. Colour links reset to these.
const DEFAULTS = {
  outline: true,  outlineColor: '#000000', outlineWidth: 10,
  outer:   true,  outerColor:   '#ffffff', outerWidth:   11,
  third:   true,  thirdColor:   '#000000', thirdWidth:   2,
  card:    true,  cardSize: 1.45, // colour: poseCardColorFor(character) — gold when special
};
const COLOR_NAMES = { '#000000': 'black', '#ffffff': 'white' };

/**
 * Preview + lightweight edit dialog for the "Current Pose" export.
 * Renders the pose to a PNG (with the chosen edits applied), shows it on a
 * checkerboard so transparency reads, and exports the wrapped SVG on confirm.
 */
export function PosePreviewDialog({ open, onClose, character, animationName, currentTime = 0 }) {
  const [outline, setOutline] = useState(DEFAULTS.outline);
  const [outlineColor, setOutlineColor] = useState(DEFAULTS.outlineColor);
  const [outlineWidth, setOutlineWidth] = useState(DEFAULTS.outlineWidth);
  const [outer, setOuter] = useState(DEFAULTS.outer);
  const [outerColor, setOuterColor] = useState(DEFAULTS.outerColor);
  const [outerWidth, setOuterWidth] = useState(DEFAULTS.outerWidth);
  const [third, setThird] = useState(DEFAULTS.third);
  const [thirdColor, setThirdColor] = useState(DEFAULTS.thirdColor);
  const [thirdWidth, setThirdWidth] = useState(DEFAULTS.thirdWidth);
  const [card, setCard] = useState(DEFAULTS.card);
  const [cardColor, setCardColor] = useState(() => poseCardColorFor(character));
  const [cardSize, setCardSize] = useState(DEFAULTS.cardSize);
  const [preview, setPreview] = useState(null); // { pngDataUrl, width, height }
  const [rendering, setRendering] = useState(false);
  const colorRef = useRef(null);
  const outerColorRef = useRef(null);
  const thirdColorRef = useRef(null);
  const cardColorRef = useRef(null);
  const baseRef  = useRef(null); // cached rendered base { canvas, ratio, wLogical, hLogical }

  // Reset edits each time the dialog opens.
  useEffect(() => {
    if (open) {
      setOutline(DEFAULTS.outline); setOutlineColor(DEFAULTS.outlineColor); setOutlineWidth(DEFAULTS.outlineWidth);
      setOuter(DEFAULTS.outer); setOuterColor(DEFAULTS.outerColor); setOuterWidth(DEFAULTS.outerWidth);
      setThird(DEFAULTS.third); setThirdColor(DEFAULTS.thirdColor); setThirdWidth(DEFAULTS.thirdWidth);
      setCard(DEFAULTS.card); setCardColor(poseCardColorFor(character)); setCardSize(DEFAULTS.cardSize);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const opts = () => ({
    outline:      { enabled: outline, color: outlineColor, width: outlineWidth },
    outerOutline: { enabled: outer,   color: outerColor,   width: outerWidth },
    thirdOutline: { enabled: third,   color: thirdColor,   width: thirdWidth },
    card:         { enabled: card,    color: cardColor,    size: cardSize },
  });

  // Render the character base once per (character, animation, time).
  useEffect(() => {
    if (!open || !character) { baseRef.current = null; setPreview(null); return; }
    let stale = false;
    setRendering(true);
    renderPosePreviewBase(character, animationName, currentTime).then((base) => {
      if (stale) return;
      baseRef.current = base;
      setPreview(composePose(base, opts()));
      setRendering(false);
    });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, character, animationName, currentTime]);

  // Re-compose (cheap) when an edit changes, reusing the cached base.
  useEffect(() => {
    if (!open || !baseRef.current) return;
    setPreview(composePose(baseRef.current, opts()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline, outlineColor, outlineWidth, outer, outerColor, outerWidth, third, thirdColor, thirdWidth, card, cardColor, cardSize]);

  if (!open) return null;

  const handleExport = () => {
    if (!preview) return;
    downloadPoseSVG(character, animationName, poseSVGMarkup(preview.pngDataUrl, preview.width, preview.height), { asCard: card });
    onClose();
  };

  const handleExportPNG = () => {
    if (!preview) return;
    downloadPosePNG(character, animationName, preview.pngDataUrl, { asCard: card });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pose-preview-title"
        className="relative w-[640px] max-w-[94vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="pose-preview-title" className="text-sm font-semibold text-foreground">
            Export Current Pose{animationName ? ` · ${animationName}` : ''}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 flex gap-4">
          {/* Preview */}
          <div
            className="relative flex-1 min-h-[340px] rounded-md border border-border overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor: '#9aa0a6',
              backgroundImage:
                'linear-gradient(45deg,#7f868c 25%,transparent 25%),linear-gradient(-45deg,#7f868c 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#7f868c 75%),linear-gradient(-45deg,transparent 75%,#7f868c 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0,0 10px,10px -10px,-10px 0',
            }}
          >
            {preview ? (
              <img
                src={preview.pngDataUrl}
                alt="Pose preview"
                className="max-h-[420px] max-w-full object-contain drop-shadow"
              />
            ) : (
              <span className="text-xs text-muted-foreground">Rendering…</span>
            )}
            {rendering && preview && (
              <span className="absolute top-2 right-2 text-[10px] text-white/80 bg-black/40 rounded px-1.5 py-0.5">updating…</span>
            )}
          </div>

          {/* Edit controls */}
          <div className="w-[210px] shrink-0 flex flex-col gap-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Edits</div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} className="accent-primary" />
                <span className="text-xs text-foreground">Outline around character</span>
              </label>

              {outline && (
                <OutlineFields
                  color={outlineColor} onColor={setOutlineColor} defaultColor={DEFAULTS.outlineColor} defaultLabel={COLOR_NAMES[DEFAULTS.outlineColor]}
                  width={outlineWidth} onWidth={setOutlineWidth} colorRef={colorRef}
                />
              )}

              {outline && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
                    <input type="checkbox" checked={outer} onChange={(e) => setOuter(e.target.checked)} className="accent-primary" />
                    <span className="text-xs text-foreground">Second outline around it</span>
                  </label>
                  {outer && (
                    <OutlineFields
                      color={outerColor} onColor={setOuterColor} defaultColor={DEFAULTS.outerColor} defaultLabel={COLOR_NAMES[DEFAULTS.outerColor]}
                      width={outerWidth} onWidth={setOuterWidth} colorRef={outerColorRef}
                    />
                  )}
                  {outer && (
                    <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
                      <input type="checkbox" checked={third} onChange={(e) => setThird(e.target.checked)} className="accent-primary" />
                      <span className="text-xs text-foreground">Third outline around it</span>
                    </label>
                  )}
                  {outer && third && (
                    <OutlineFields
                      color={thirdColor} onColor={setThirdColor} defaultColor={DEFAULTS.thirdColor} defaultLabel={COLOR_NAMES[DEFAULTS.thirdColor]}
                      width={thirdWidth} onWidth={setThirdWidth} colorRef={thirdColorRef}
                    />
                  )}
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={card} onChange={(e) => setCard(e.target.checked)} className="accent-primary" />
                <span className="text-xs text-foreground">Card background</span>
              </label>
              {card && (
                <div className="flex flex-col gap-2 pl-1">
                  <ColorRow color={cardColor} onColor={setCardColor} defaultColor={poseCardColorFor(character)} defaultLabel={character?.special ? 'gold' : 'blue'} colorRef={cardColorRef} />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Character size</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setCardSize(v => Math.max(CARD_SIZE_MIN, +(v - CARD_SIZE_STEP).toFixed(2)))} disabled={cardSize <= CARD_SIZE_MIN} className={STEP_BTN}>−</button>
                      <span className="text-[11px] min-w-[34px] text-center font-mono text-primary">{Math.round(cardSize * 100)}%</span>
                      <button onClick={() => setCardSize(v => Math.min(CARD_SIZE_MAX, +(v + CARD_SIZE_STEP).toFixed(2)))} disabled={cardSize >= CARD_SIZE_MAX} className={STEP_BTN}>+</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground/70 leading-relaxed mt-auto">
              {card
                ? 'The card is included in the exported SVG or PNG.'
                : 'The exported SVG / PNG has a transparent background; the checkerboard is only shown here so the outline is visible.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={handleExportPNG} disabled={!preview} className={cn(!preview && 'opacity-50')}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export PNG
          </Button>
          <Button onClick={handleExport} disabled={!preview} className={cn(!preview && 'opacity-50')}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export SVG
          </Button>
        </div>
      </div>
    </div>
  );
}

const clampWidth = (v) => Math.max(OUTLINE_MIN, Math.min(OUTLINE_MAX, v));
const STEP_BTN = 'w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-[13px] leading-none flex items-center justify-center hover:border-primary disabled:opacity-35 transition-colors';

/** Colour swatch + thickness stepper for one outline band. */
function OutlineFields({ color, onColor, defaultColor, defaultLabel, width, onWidth, colorRef }) {
  return (
    <div className="flex flex-col gap-2 pl-1">
      <ColorRow color={color} onColor={onColor} defaultColor={defaultColor} defaultLabel={defaultLabel} colorRef={colorRef} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Thickness</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onWidth(w => clampWidth(w - OUTLINE_STEP))} disabled={width <= OUTLINE_MIN} className={STEP_BTN}>−</button>
          <span className="text-[11px] min-w-[34px] text-center font-mono text-primary">{width}px</span>
          <button onClick={() => onWidth(w => clampWidth(w + OUTLINE_STEP))} disabled={width >= OUTLINE_MAX} className={STEP_BTN}>+</button>
        </div>
      </div>
    </div>
  );
}

/** Colour label + swatch (opens the native picker) + reset-to-default link. */
function ColorRow({ color, onColor, defaultColor, defaultLabel, colorRef }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">Colour</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => colorRef.current?.click()}
          className="w-6 h-6 rounded border-2 border-white/20 hover:border-white/50 transition-colors"
          style={{ background: color }}
          title="Pick colour"
        />
        <input ref={colorRef} type="color" value={color} onChange={(e) => onColor(e.target.value)} className="sr-only" />
        {color.toLowerCase() !== defaultColor && (
          <button type="button" onClick={() => onColor(defaultColor)} className="text-[10px] text-muted-foreground hover:text-foreground">{defaultLabel}</button>
        )}
      </div>
    </div>
  );
}
