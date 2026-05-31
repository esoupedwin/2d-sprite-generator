import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { SectionTitle } from '@/components/ui/section-title.jsx';
import { getPoseAtTime, EASE_MODES } from '../systems/AnimationSystem.js';
import { AnimationTimeline } from './AnimationTimeline.jsx';
import { Trash2 } from 'lucide-react';

// Format a number for compact, readable display
function fmt(n) {
  if (n === undefined || n === null) return '';
  const abs = Math.abs(n);
  if (abs < 0.0005) return '0';
  return (n > 0 ? '+' : '') + n.toFixed(3).replace(/\.?0+$/, '');
}

function offsetLine(off) {
  if (!off) return null;
  const out = [];
  if (off.x)        out.push(`x ${fmt(off.x)}`);
  if (off.y)        out.push(`y ${fmt(off.y)}`);
  if (off.rotation) out.push(`rot ${fmt(off.rotation)}`);
  return out.length ? out.join('  ') : null;
}

const PROP_COLORS = { rotation: '#5eead4', x: '#fca5a5', y: '#93c5fd' };
const EASE_LABEL  = { auto: 'Auto', linear: 'Lin', 'ease-in': 'In', 'ease-out': 'Out', 'ease-in-out': 'S', hold: 'Hold' };

// Per-bone mini curve graph. Samples the REAL interpolation engine (Catmull-Rom
// + ease + loop) so the drawn shape matches playback exactly. The graph is a
// direct-manipulation surface, not decoration:
//   • click/drag the background → scrub the playhead to that time
//   • click a keyframe dot → select that keyframe (opens its editor below)
//   • a shared live playhead (driven by the parent's --ph CSS var) sweeps
//     across every graph so the timeline, curves, and values stay tied together.
// Each animated prop is normalized independently so its shape reads regardless
// of unit (radians vs px).
function CurveGraph({ boneId, kfs, duration, loop, activeKeyframe, onKeyframeClick, onScrub }) {
  const wrapRef = useRef(null);
  const W = 220, H = 34, PAD = 4, N = 56;
  const props = ['rotation', 'x', 'y'].filter(p => kfs.some(k => k[p] !== undefined));

  const scrubFromEvent = useCallback((e) => {
    const el = wrapRef.current;
    if (!el || duration <= 0) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    onScrub(+(x * duration).toFixed(2));
  }, [duration, onScrub]);

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    scrubFromEvent(e);
    const move = (ev) => scrubFromEvent(ev);
    const up   = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [scrubFromEvent]);

  if (props.length === 0 || duration <= 0) return null;

  const mini = { duration, loop, tracks: { [boneId]: kfs } };
  const samples = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * duration;
    samples.push({ t, v: getPoseAtTime(mini, t)[boneId] });
  }

  const xAt = (t) => (t / duration) * W;
  const activeKey = activeKeyframe?.boneId === boneId ? activeKeyframe.time.toFixed(2) : null;

  const lineFor = (p) => {
    let lo = Infinity, hi = -Infinity;
    for (const s of samples) { lo = Math.min(lo, s.v[p]); hi = Math.max(hi, s.v[p]); }
    const span = hi - lo || 1;
    const yAt = (val) => H - PAD - ((val - lo) / span) * (H - 2 * PAD);
    const d = samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${xAt(s.t).toFixed(1)},${yAt(s.v[p]).toFixed(1)}`).join(' ');
    const dots = kfs.filter(k => k[p] !== undefined)
      .map(k => ({ x: xAt(k.time), y: yAt(k[p]), time: k.time, active: k.time.toFixed(2) === activeKey }));
    return { d, dots };
  };

  return (
    <div ref={wrapRef} onPointerDown={onPointerDown} className="relative my-0.5 cursor-pointer select-none">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block">
        <rect x="0" y="0" width={W} height={H} rx="3" fill="rgba(255,255,255,0.02)" />
        {props.map(p => {
          const { d, dots } = lineFor(p);
          return (
            <g key={p}>
              <path d={d} fill="none" stroke={PROP_COLORS[p]} strokeWidth="1" opacity="0.85" vectorEffect="non-scaling-stroke" />
              {dots.map((dt, i) => (
                <g key={i}>
                  <circle cx={dt.x} cy={dt.y} r={dt.active ? 2.8 : 1.6}
                    fill={dt.active ? '#fde047' : PROP_COLORS[p]}
                    stroke={dt.active ? '#000' : 'none'} strokeWidth="0.5" />
                  {/* enlarged invisible hit target ON TOP so a precise click on
                      the dot selects the keyframe instead of scrubbing */}
                  <circle
                    cx={dt.x} cy={dt.y} r="7" fill="transparent" className="cursor-pointer"
                    onPointerDown={(e) => { e.stopPropagation(); onKeyframeClick?.(boneId, dt.time); }}
                  />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      {/* live playhead — position set by parent via the --ph CSS variable */}
      <div
        className="absolute top-0 bottom-0 w-px bg-teal-400/70 pointer-events-none"
        style={{ left: 'var(--ph, 0%)' }}
      />
    </div>
  );
}

// Editable controls revealed when a keyframe row is selected: numeric value
// entry per prop, time (retime), ease mode, and delete.
function KeyframeEditor({ boneId, kf, duration, onSetValue, onSetEase, onRetime, onDelete }) {
  const ease = kf.ease ?? 'auto';
  const props = ['rotation', 'x', 'y'].filter(p => kf[p] !== undefined);

  return (
    <div className="mt-1 mb-1.5 ml-2 flex flex-col gap-1.5 rounded border border-border/70 bg-secondary/30 p-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
          t=
          <input
            type="number" step="0.01" min="0" max={duration}
            defaultValue={kf.time.toFixed(2)}
            key={`t-${boneId}-${kf.time}`}
            onBlur={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && Math.abs(v - kf.time) > 1e-4) onRetime(boneId, kf.time, v); }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="w-12 bg-background border border-border rounded px-1 py-0.5 text-[11px] font-mono text-foreground"
          />
        </label>
        {props.map(p => (
          <label key={p} className="flex items-center gap-1 text-[10px]" style={{ color: PROP_COLORS[p] }}>
            {p === 'rotation' ? 'rot' : p}
            <input
              type="number" step="0.01"
              defaultValue={(kf[p] ?? 0).toFixed(3)}
              key={`${p}-${boneId}-${kf.time}-${kf[p]}`}
              onBlur={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && Math.abs(v - (kf[p] ?? 0)) > 1e-5) onSetValue(boneId, kf.time, p, +v.toFixed(4)); }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              className="w-14 bg-background border border-border rounded px-1 py-0.5 text-[11px] font-mono text-foreground"
            />
          </label>
        ))}
        <button
          type="button"
          onClick={() => onDelete(boneId, kf.time)}
          title="Delete this keyframe"
          className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mr-0.5">Ease</span>
        {EASE_MODES.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => onSetEase(boneId, kf.time, m)}
            title={m}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
              ease === m
                ? 'border-teal-400 bg-teal-400/15 text-teal-300'
                : 'border-border text-muted-foreground hover:border-teal-400/50'
            }`}
          >
            {EASE_LABEL[m]}
          </button>
        ))}
      </div>
    </div>
  );
}

export const AnimationCurvePanel = memo(function AnimationCurvePanel({
  animation, offsets, overrides,
  activeKeyframe, onKeyframeClick,
  onCommitOverrides, onSaveAsTemplate,
  // editing
  getTime, onScrub, onAddKeyframe,
  onDeleteKeyframe, onRetimeKeyframe, onSetEase, onSetValue, onSetDuration,
  onionSkin, onToggleOnion,
}) {
  const [durDraft, setDurDraft] = useState('');
  useEffect(() => { setDurDraft(animation?.duration != null ? String(animation.duration) : ''); }, [animation?.duration]);

  // One RAF drives a shared playhead across every curve graph: it sets the --ph
  // CSS variable on the track container, and each graph's playhead reads it.
  // No per-frame React state, so the editor doesn't re-render 60×/s.
  const tracksRef = useRef(null);
  const dur = animation?.duration ?? 0;
  useEffect(() => {
    let raf;
    const tick = () => {
      const t = getTime?.() ?? 0;
      const pct = dur > 0 ? Math.max(0, Math.min(100, (t / dur) * 100)) : 0;
      tracksRef.current?.style.setProperty('--ph', `${pct}%`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getTime, dur]);

  if (!animation) {
    return <div className="text-xs text-muted-foreground">No animation data.</div>;
  }

  const tracks = animation.tracks ?? {};
  const boneIds = Object.keys(tracks);
  const loop = animation.loop !== false;
  const duration = animation.duration ?? 0;

  const hasOverrides = (overrides && Object.values(overrides).some(boneOv => Object.keys(boneOv).length > 0))
    || (offsets && Object.keys(offsets).length > 0);

  // Union of all keyframe times for the timeline ticks.
  const keyTimes = Array.from(new Set(
    boneIds.flatMap(b => tracks[b].map(k => +k.time.toFixed(3)))
  )).sort((a, b) => a - b);

  const commitDuration = () => {
    const v = parseFloat(durDraft);
    if (!Number.isNaN(v) && Math.abs(v - duration) > 1e-4) onSetDuration(v);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <SectionTitle>Animation Data</SectionTitle>
        <span className="text-[11px] text-muted-foreground font-mono">
          {animation.name} · {loop ? 'loop' : 'once'}
        </span>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {hasOverrides && (
          <button
            type="button"
            onClick={onCommitOverrides}
            className="text-[11px] px-2 py-0.5 rounded border border-amber-400/40 text-amber-400 hover:bg-amber-400/10 transition-colors"
          >
            Commit edits
          </button>
        )}
        <button
          type="button"
          onClick={onSaveAsTemplate}
          className="text-[11px] px-2 py-0.5 rounded border border-teal-400/40 text-teal-400 hover:bg-teal-400/10 transition-colors"
        >
          Save as template
        </button>
      </div>

      {/* Duration + onion-skin */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          Duration
          <input
            type="number" step="0.05" min="0.1" max="10"
            value={durDraft}
            onChange={(e) => setDurDraft(e.target.value)}
            onBlur={commitDuration}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            className="w-16 bg-background border border-border rounded px-1 py-0.5 text-[11px] font-mono text-foreground normal-case tracking-normal"
          />
          s
        </label>
        <label className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={!!onionSkin} onChange={onToggleOnion} className="accent-teal-400" />
          Onion skin
        </label>
      </div>

      <AnimationTimeline
        duration={duration}
        keyTimes={keyTimes}
        activeTime={activeKeyframe?.time ?? null}
        getTime={getTime}
        onScrub={onScrub}
        onAddKeyframe={onAddKeyframe}
      />

      <div className="text-xs text-muted-foreground/70 leading-snug">
        Scrub the timeline to any moment, then <span className="text-teal-400">+ Key</span> or drag a joint to
        author there. Click a keyframe to edit its values, timing &amp; easing.
      </div>

      <div ref={tracksRef} className="flex flex-col gap-2 border border-border rounded-md p-2 font-mono max-h-[640px] overflow-y-auto pr-1">
        {boneIds.length === 0 && (
          <div className="text-xs text-muted-foreground">No tracks.</div>
        )}
        {boneIds.map(boneId => {
          const kfs = tracks[boneId] ?? [];
          const off = offsetLine(offsets?.[boneId]);
          const boneOv = overrides?.[boneId] ?? null;
          return (
            <div key={boneId} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{boneId}</span>
                {off && (
                  <span className="text-teal-400 text-xs" title="Edit Pose offset">Δ {off}</span>
                )}
              </div>

              <CurveGraph
                boneId={boneId} kfs={kfs} duration={duration} loop={loop}
                activeKeyframe={activeKeyframe} onKeyframeClick={onKeyframeClick} onScrub={onScrub}
              />

              <div className="flex flex-col gap-px pl-1 text-xs">
                {kfs.map((kf, i) => {
                  const key = kf.time.toFixed(2);
                  const isActive   = activeKeyframe && activeKeyframe.boneId === boneId && activeKeyframe.time.toFixed(2) === key;
                  const overridden = boneOv && boneOv[key];
                  const ease = kf.ease ?? 'auto';
                  const cls = isActive
                    ? 'text-yellow-300 bg-yellow-300/10'
                    : overridden
                      ? 'text-amber-300 hover:bg-secondary'
                      : 'text-muted-foreground hover:bg-secondary';
                  return (
                    <div key={i}>
                      <button
                        type="button"
                        onClick={() => onKeyframeClick?.(boneId, kf.time)}
                        className={`w-full flex gap-2 items-center text-left px-1 -mx-1 rounded transition-colors ${cls}`}
                        title="Click to select / edit at this time"
                      >
                        <span className="opacity-70 w-10">t={key}</span>
                        <span className="flex-1">
                          {['rotation', 'x', 'y'].filter(p => kf[p] !== undefined)
                            .map(p => `${p === 'rotation' ? 'rot' : p} ${fmt(kf[p])}`).join('  ') || '—'}
                        </span>
                        {ease !== 'auto' && (
                          <span className="text-[9px] uppercase tracking-wider text-teal-400/70">{EASE_LABEL[ease]}</span>
                        )}
                        {overridden && <span className="opacity-70 text-[10px]">·edited</span>}
                      </button>
                      {isActive && (
                        <KeyframeEditor
                          boneId={boneId}
                          kf={kf}
                          duration={duration}
                          onSetValue={onSetValue}
                          onSetEase={onSetEase}
                          onRetime={onRetimeKeyframe}
                          onDelete={onDeleteKeyframe}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
