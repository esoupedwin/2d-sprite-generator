import { useEffect, useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import { renderPosePreviewBase, composePose, poseSVGMarkup, downloadPoseSVG, downloadPosePNG, poseCardColorFor, POSE_CARD_FEET_Y, exportPoseImages, trimTrailingSlashes } from '../utils/export.js';
import { defaultAnimationFor } from '../systems/AnimationSystem.js';
import { characterLabel } from '../utils/characters.js';
import { useFolderOptions, preferredFolderKey, FolderPicker } from './FolderExportDialog.jsx';
import { useSheetExport, OutputFolderField, ExportProgress, ExportResult, ExportFooter } from './SheetExportParts.jsx';

const OUTLINE_MIN = 1, OUTLINE_MAX = 24, OUTLINE_STEP = 1;
const CARD_SIZE_MIN = 0.5, CARD_SIZE_MAX = 2, CARD_SIZE_STEP = 0.05;
const FEET_MIN = 0.2, FEET_MAX = 1, FEET_STEP = 0.01;

// What the dialog opens with every time: a black outline, a white band and a
// thin black rim around it, on the blue card. Colour links reset to these.
const DEFAULTS = {
  outline: true,  outlineColor: '#000000', outlineWidth: 10,
  outer:   true,  outerColor:   '#ffffff', outerWidth:   11,
  third:   true,  thirdColor:   '#000000', thirdWidth:   2,
  card:    true,  cardSize: 1.45, feetY: POSE_CARD_FEET_Y, // colour: poseCardColorFor(character) — gold when special
};
const COLOR_NAMES = { '#000000': 'black', '#ffffff': 'white' };

/**
 * Preview + lightweight edit dialog for the "Current Pose" export.
 * Renders the pose to a PNG (with the chosen edits applied), shows it on a
 * checkerboard so transparency reads, and exports the wrapped SVG on confirm.
 *
 * `batch` turns it into "Multiple Static Images or Cards": pick a manager
 * folder and the same edits are applied to every character in it (each in its
 * default action at t = 0), written as PNGs through the dev server — see
 * exportPoseImages. Click a character chip to preview it.
 */
export function PosePreviewDialog({ open, onClose, character, animationName, currentTime = 0, batch = false, characters = [], folders = [], defaultFolder = null }) {
  const folderOptions = useFolderOptions(characters, folders);
  const [folder, setFolder] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const selected = batch ? (folderOptions.find(o => o.key === folder) ?? null) : null;
  const previewChar = batch
    ? (selected?.chars.find(c => c.id === previewId) ?? selected?.chars[0] ?? null)
    : character;
  const previewAnim = batch ? (previewChar ? defaultAnimationFor(previewChar) : null) : animationName;
  const previewTime = batch ? 0 : currentTime;

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
  // null = each character's own default (blue, gold when special).
  const [cardColor, setCardColor] = useState(null);
  const cardDefault = poseCardColorFor(previewChar);
  const cardColorShown = cardColor ?? cardDefault;
  const [cardSize, setCardSize] = useState(DEFAULTS.cardSize);
  const [feetY, setFeetY] = useState(DEFAULTS.feetY);
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
      setCard(DEFAULTS.card); setCardColor(null); setCardSize(DEFAULTS.cardSize); setFeetY(DEFAULTS.feetY);
      if (batch) { setFolder(preferredFolderKey(folderOptions, defaultFolder)); setPreviewId(null); }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || batch) return; // batch: useSheetExport owns Escape (blocked mid-export)
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, batch, onClose]);

  const opts = (c = previewChar) => ({
    outline:      { enabled: outline, color: outlineColor, width: outlineWidth },
    outerOutline: { enabled: outer,   color: outerColor,   width: outerWidth },
    thirdOutline: { enabled: third,   color: thirdColor,   width: thirdWidth },
    card:         { enabled: card,    color: cardColor ?? poseCardColorFor(c), size: cardSize, feetY },
  });
  // The latest settings, for the async first render below: its closure is from
  // the render that started it, which can predate the reset-on-open above (so
  // it would compose with the PREVIOUS opening's colours).
  const optsRef = useRef(null);
  optsRef.current = opts();

  // Render the character base once per (character, animation, time).
  useEffect(() => {
    if (!open || !previewChar) { baseRef.current = null; setPreview(null); return; }
    let stale = false;
    setRendering(true);
    renderPosePreviewBase(previewChar, previewAnim, previewTime).then((base) => {
      if (stale) return;
      baseRef.current = base;
      setPreview(composePose(base, optsRef.current));
      setRendering(false);
    });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, previewChar, previewAnim, previewTime]);

  // Re-compose (cheap) when an edit changes, reusing the cached base.
  useEffect(() => {
    if (!open || !baseRef.current) return;
    setPreview(composePose(baseRef.current, opts()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline, outlineColor, outlineWidth, outer, outerColor, outerWidth, third, thirdColor, thirdWidth, card, cardColor, cardSize, feetY]);

  const ex = useSheetExport(open && batch,
    (o) => exportPoseImages(selected?.chars ?? [], { root: o.root, onProgress: o.onProgress, optionsFor: (c) => opts(c) }),
    onClose);

  if (!open) return null;
  const count = selected?.chars.length ?? 0;

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !ex.busy && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pose-preview-title"
        className="relative w-[640px] max-w-[94vw] max-h-[94vh] overflow-y-auto rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="pose-preview-title" className="text-sm font-semibold text-foreground">
            {batch
              ? <>Export Multiple Static Images or Cards{previewChar ? <span className="font-normal text-muted-foreground"> · previewing {characterLabel(previewChar)}</span> : null}</>
              : <>Export Current Pose{animationName ? ` · ${animationName}` : ''}</>}
          </h2>
          <button type="button" onClick={onClose} disabled={ex.busy} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
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
                  <ColorRow color={cardColorShown} onColor={(c) => setCardColor(c.toLowerCase() === cardDefault ? null : c)} defaultColor={cardDefault} defaultLabel={batch ? 'each default' : (previewChar?.special ? 'gold' : 'blue')} colorRef={cardColorRef} />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Character size</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setCardSize(v => Math.max(CARD_SIZE_MIN, +(v - CARD_SIZE_STEP).toFixed(2)))} disabled={cardSize <= CARD_SIZE_MIN} className={STEP_BTN}>−</button>
                      <span className="text-[11px] min-w-[34px] text-center font-mono text-primary">{Math.round(cardSize * 100)}%</span>
                      <button onClick={() => setCardSize(v => Math.min(CARD_SIZE_MAX, +(v + CARD_SIZE_STEP).toFixed(2)))} disabled={cardSize >= CARD_SIZE_MAX} className={STEP_BTN}>+</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground" title="How far down the card the character's feet sit (0% = top, 100% = bottom). Always centred horizontally.">Feet position</span>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setFeetY(v => Math.max(FEET_MIN, +(v - FEET_STEP).toFixed(2)))} disabled={feetY <= FEET_MIN} className={STEP_BTN}>−</button>
                        <span className="text-[11px] min-w-[34px] text-center font-mono text-primary">{Math.round(feetY * 100)}%</span>
                        <button onClick={() => setFeetY(v => Math.min(FEET_MAX, +(v + FEET_STEP).toFixed(2)))} disabled={feetY >= FEET_MAX} className={STEP_BTN}>+</button>
                      </div>
                    </div>
                    <input
                      type="range" min={FEET_MIN} max={FEET_MAX} step={FEET_STEP} value={feetY}
                      onChange={(e) => setFeetY(+e.target.value)}
                      className="w-full accent-primary"
                      aria-label="Feet position"
                    />
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground/70 leading-relaxed mt-auto">
              {batch
                ? (card
                  ? 'Each character gets the card, in its default action. Left at its default, the card colour follows each character (gold when special).'
                  : 'Transparent PNG per character, in its default action; the checkerboard is only shown here.')
                : card
                  ? 'The card is included in the exported SVG or PNG.'
                  : 'The exported SVG / PNG has a transparent background; the checkerboard is only shown here so the outline is visible.'}
            </p>
          </div>
        </div>

        {batch ? (
          <>
            <div className="px-4 pb-3 grid grid-cols-2 gap-4 border-t border-border pt-3">
              <FolderPicker options={folderOptions} value={folder} onChange={(k) => { setFolder(k); setPreviewId(null); }} disabled={ex.busy} />
              <div className="flex flex-col gap-3 min-w-0">
                <OutputFolderField value={ex.outDir} onChange={ex.setOutDir} disabled={ex.busy}>
                  {count > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono break-all">
                      → {ex.outDir.trim() ? trimTrailingSlashes(ex.outDir.trim()) : '<folder>'}/{selected.chars[0].folder ? `${selected.chars[0].folder}/` : ''}{card ? 'card_buy_<character>' : '<character>_pose'}.png
                      <span className="text-muted-foreground/60"> ×{count}</span>
                    </span>
                  )}
                </OutputFolderField>
                {selected && (
                  <div className="flex flex-wrap gap-1">
                    {selected.chars.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setPreviewId(c.id)}
                        title="Preview this character"
                        className={cn(
                          'px-2 py-0.5 rounded-full border text-[11px] transition-colors',
                          c.id === previewChar?.id ? 'border-primary bg-primary/15 text-foreground' : 'border-border bg-secondary text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {characterLabel(c)}
                      </button>
                    ))}
                  </div>
                )}
                <ExportProgress progress={ex.progress} />
                <ExportResult
                  result={ex.result}
                  renderOk={r => <>Wrote {r.written} PNG{r.written === 1 ? '' : 's'} for {r.characters} character{r.characters === 1 ? '' : 's'} under <span className="font-mono text-foreground break-all">{r.root}</span></>}
                />
              </div>
            </div>
            <ExportFooter
              busy={ex.busy}
              ok={!!ex.result?.ok}
              canExport={ex.ready && count > 0}
              onClose={onClose}
              onRun={ex.run}
              label={`Export ${count} PNG${count === 1 ? '' : 's'}`}
            />
          </>
        ) : (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="outline" onClick={handleExportPNG} disabled={!preview} className={cn(!preview && 'opacity-50')}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export PNG
            </Button>
            <Button onClick={handleExport} disabled={!preview} className={cn(!preview && 'opacity-50')}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export SVG
            </Button>
          </div>
        )}
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
