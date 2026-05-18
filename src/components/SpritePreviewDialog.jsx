import { useEffect, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { buildSpriteSheet } from '../utils/export.js';
import { MIN_FRAMES, MAX_FRAMES } from '../utils/spriteExportConfig.js';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2];
const DEFAULT_LEFT  = 20;
const DEFAULT_RIGHT = 40;

// Display size per preview panel — independent of the sheet's backing
// resolution which stays at FRAME_W × FRAME_H × pixelRatio for crisp draws.
const PANEL_W = 220;
const PANEL_H = 258;

// How often to push the playback time into React state for the "0.07 / 1.85s"
// readout. We update at 10 Hz; the actual drawing still runs every RAF tick.
const TIME_DISPLAY_MS = 100;

/**
 * Plays back two sprite sheets generated from the same animation at
 * different frame counts so the user can compare smoothness side-by-side.
 * Playback time is shared between both panels.
 *
 * The animation loop is fully imperative: a single `requestAnimationFrame`
 * runs while the dialog is open, advancing a time ref and calling
 * `ctx.drawImage` directly on each panel's canvas. React state only changes
 * for things the user can actually see change (frame count, play state,
 * speed, and a throttled time readout) — not 60 times a second.
 */
export function SpritePreviewDialog({ open, onClose, character, animationName }) {
  const [leftFC,  setLeftFC]  = useState(DEFAULT_LEFT);
  const [rightFC, setRightFC] = useState(DEFAULT_RIGHT);
  const [leftSheet,  setLeftSheet]  = useState(null);
  const [rightSheet, setRightSheet] = useState(null);
  const [leftBuilding,  setLeftBuilding]  = useState(false);
  const [rightBuilding, setRightBuilding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed]         = useState(1);
  const [tDisplay, setTDisplay]   = useState(0);   // throttled, UI only

  const leftCanvasRef  = useRef(null);
  const rightCanvasRef = useRef(null);

  // Refs that the RAF loop reads — mirrors of state so the loop doesn't
  // need to be torn down and rebuilt every time one of these changes.
  const timeRef       = useRef(0);
  const isPlayingRef  = useRef(true);
  const speedRef      = useRef(1);
  const leftSheetRef  = useRef(null);
  const rightSheetRef = useRef(null);

  useEffect(() => { isPlayingRef.current  = isPlaying;  }, [isPlaying]);
  useEffect(() => { speedRef.current      = speed;      }, [speed]);
  useEffect(() => { leftSheetRef.current  = leftSheet;  }, [leftSheet]);
  useEffect(() => { rightSheetRef.current = rightSheet; }, [rightSheet]);

  // Reset on open.
  useEffect(() => {
    if (!open) return;
    setLeftFC(DEFAULT_LEFT);
    setRightFC(DEFAULT_RIGHT);
    timeRef.current = 0;
    setTDisplay(0);
    setIsPlaying(true);
  }, [open]);

  // Build the left sheet.
  useEffect(() => {
    if (!open || !character || !animationName) { setLeftSheet(null); return; }
    let cancelled = false;
    setLeftBuilding(true);
    buildSpriteSheet(character, animationName, { frameCount: leftFC, drawGrid: true }).then(s => {
      if (cancelled) return;
      setLeftSheet(s);
      setLeftBuilding(false);
    }).catch(() => { if (!cancelled) setLeftBuilding(false); });
    return () => { cancelled = true; };
  }, [open, character, animationName, leftFC]);

  // Build the right sheet.
  useEffect(() => {
    if (!open || !character || !animationName) { setRightSheet(null); return; }
    let cancelled = false;
    setRightBuilding(true);
    buildSpriteSheet(character, animationName, { frameCount: rightFC, drawGrid: true }).then(s => {
      if (cancelled) return;
      setRightSheet(s);
      setRightBuilding(false);
    }).catch(() => { if (!cancelled) setRightBuilding(false); });
    return () => { cancelled = true; };
  }, [open, character, animationName, rightFC]);

  // Single RAF loop for the lifetime of the open dialog. Reads everything
  // off refs so it doesn't tear down when frame count / speed / playing /
  // sheet swap — those changes are picked up on the next tick.
  useEffect(() => {
    if (!open) return;
    let raf;
    let lastTs       = null;
    let lastDisplay  = 0;
    const tick = (ts) => {
      const ls  = leftSheetRef.current;
      const rs  = rightSheetRef.current;
      const dur = ls?.duration ?? rs?.duration ?? 0;
      const lp  = ls?.loop     ?? rs?.loop     ?? true;

      if (lastTs !== null && isPlayingRef.current && dur > 0) {
        const dt = ((ts - lastTs) / 1000) * speedRef.current;
        let next = timeRef.current + dt;
        if (lp) {
          next %= dur;
        } else if (next >= dur) {
          next = dur;
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
        timeRef.current = next;
      }
      lastTs = ts;

      drawSheetFrame(leftCanvasRef.current,  ls, timeRef.current);
      drawSheetFrame(rightCanvasRef.current, rs, timeRef.current);

      if (ts - lastDisplay > TIME_DISPLAY_MS) {
        setTDisplay(timeRef.current);
        lastDisplay = ts;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const duration   = leftSheet?.duration ?? rightSheet?.duration ?? 0;
  const loop       = leftSheet?.loop     ?? rightSheet?.loop     ?? true;
  const tNorm      = duration > 0 ? Math.min(1, tDisplay / duration) : 0;
  const headerName = leftSheet?.name ?? rightSheet?.name ?? animationName ?? '';

  const onScrub = (e) => {
    const v = Number(e.target.value) / 1000;
    const t = v * duration;
    timeRef.current = t;
    setTDisplay(t);
    setIsPlaying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sprite-preview-title"
        className="relative w-[600px] max-w-[96vw] rounded-lg border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 id="sprite-preview-title" className="text-sm font-semibold text-foreground">
            Sprite Sheet Preview · {headerName}
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

        <div className="p-4 flex flex-col gap-3">
          <div className="flex justify-center gap-3">
            <PreviewPanel
              label="A"
              canvasRef={leftCanvasRef}
              sheet={leftSheet}
              building={leftBuilding}
              frameCount={leftFC}
              setFrameCount={setLeftFC}
            />
            <PreviewPanel
              label="B"
              canvasRef={rightCanvasRef}
              sheet={rightSheet}
              building={rightBuilding}
              frameCount={rightFC}
              setFrameCount={setRightFC}
            />
          </div>

          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(tNorm * 1000)}
            disabled={duration <= 0}
            onChange={onScrub}
            className="w-full accent-emerald-500"
          />

          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>{duration > 0 ? `${tDisplay.toFixed(2)} / ${duration.toFixed(2)}s ${loop ? '· loop' : '· once'}` : ''}</span>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider">
              <span className="mr-1">Speed</span>
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    speed === s
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-border text-muted-foreground hover:border-emerald-500/60 hover:text-emerald-500'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-secondary/30 rounded-b-lg">
          <Button variant="ghost" size="sm" onClick={() => setIsPlaying(p => !p)} disabled={duration <= 0}>
            {isPlaying
              ? <><Pause className="h-3 w-3 mr-1.5" />Pause</>
              : <><Play  className="h-3 w-3 mr-1.5" />Play</>}
          </Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Stamps the current frame from `sheet` onto `canvas`, sized to the canvas's
 * own backing buffer. Called from the parent RAF loop — does NOT trigger a
 * React render. Safe to call with null inputs (no-op).
 */
function drawSheetFrame(canvas, sheet, elapsed) {
  if (!canvas || !sheet) return;
  const tNorm = elapsed / sheet.duration;
  const frame = Math.min(sheet.frameCount - 1, Math.floor(tNorm * sheet.frameCount));
  const col = frame % sheet.cols;
  const row = Math.floor(frame / sheet.cols);
  const srcW = sheet.frameW * sheet.pixelRatio;
  const srcH = sheet.frameH * sheet.pixelRatio;
  const srcX = col * srcW;
  const srcY = row * srcH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sheet.canvas, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
}

function PreviewPanel({ label, canvasRef, sheet, building, frameCount, setFrameCount }) {
  const fps = sheet ? (sheet.frameCount / sheet.duration).toFixed(1) : '—';
  const stepFrames = (delta) => setFrameCount(c =>
    Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, c + delta)));

  // Backing-buffer size. When the sheet hasn't built yet we still want a
  // non-zero canvas (so it lays out), so fall back to 2× the panel size.
  const bbW = sheet ? sheet.frameW * sheet.pixelRatio : PANEL_W * 2;
  const bbH = sheet ? sheet.frameH * sheet.pixelRatio : PANEL_H * 2;

  return (
    <div className="flex flex-col gap-1.5 items-center">
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {sheet ? `${fps} fps` : ''}
        </span>
      </div>
      <div
        className="bg-secondary/40 rounded-md border border-border overflow-hidden relative"
        style={{ width: PANEL_W, height: PANEL_H }}
      >
        <canvas
          ref={canvasRef}
          width={bbW}
          height={bbH}
          style={{ width: PANEL_W, height: PANEL_H, display: 'block' }}
        />
        {(building || !sheet) && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-muted-foreground bg-black/40">
            Rendering…
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => stepFrames(-1)}
          disabled={frameCount <= MIN_FRAMES}
          className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-sm leading-none flex items-center justify-center hover:border-emerald-500 disabled:opacity-35 disabled:cursor-default transition-colors"
        >−</button>
        <input
          type="number"
          min={MIN_FRAMES}
          max={MAX_FRAMES}
          value={frameCount}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (Number.isFinite(v)) {
              setFrameCount(Math.max(MIN_FRAMES, Math.min(MAX_FRAMES, v)));
            }
          }}
          className="w-[48px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-xs text-center font-mono focus:outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={() => stepFrames(+1)}
          disabled={frameCount >= MAX_FRAMES}
          className="w-[22px] h-[22px] rounded-sm border border-border bg-secondary text-foreground text-sm leading-none flex items-center justify-center hover:border-emerald-500 disabled:opacity-35 disabled:cursor-default transition-colors"
        >+</button>
        <span className="text-[10px] text-muted-foreground ml-1 font-mono">frames</span>
      </div>
    </div>
  );
}
