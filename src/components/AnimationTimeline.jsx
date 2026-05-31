import { useRef, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';

/**
 * Scrubbable timeline for the animation editor.
 *
 * - Click / drag anywhere on the track to scrub (pauses + seeks via onScrub).
 * - Keyframe ticks (union of all bone tracks) render along the track; the
 *   active edit time gets a brighter marker.
 * - The playhead follows live playback via its own RAF that reads getTime()
 *   and moves a ref'd element — no per-frame React state, so the rest of the
 *   editor doesn't re-render 60×/s.
 */
export function AnimationTimeline({
  duration, keyTimes, activeTime, getTime,
  onScrub, onAddKeyframe,
}) {
  const trackRef    = useRef(null);
  const playheadRef = useRef(null);
  const timeLabelRef = useRef(null);

  // Live playhead + time readout, driven by the canvas clock.
  useEffect(() => {
    let raf;
    const tick = () => {
      const t = getTime?.() ?? 0;
      if (duration > 0) {
        const pct = Math.max(0, Math.min(100, (t / duration) * 100));
        if (playheadRef.current) playheadRef.current.style.left = `${pct}%`;
      }
      if (timeLabelRef.current) timeLabelRef.current.textContent = `${(t).toFixed(2)}s`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getTime, duration]);

  const timeFromEvent = useCallback((e) => {
    const el = trackRef.current;
    if (!el || duration <= 0) return 0;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    return +(x * duration).toFixed(2);
  }, [duration]);

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    onScrub(timeFromEvent(e));
    const move = (ev) => onScrub(timeFromEvent(ev));
    const up   = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [onScrub, timeFromEvent]);

  const pct = (t) => (duration > 0 ? (t / duration) * 100 : 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Timeline</span>
        <div className="flex items-center gap-2">
          <span ref={timeLabelRef} className="text-[11px] font-mono text-teal-400 tabular-nums">0.00s</span>
          <button
            type="button"
            onClick={() => onAddKeyframe(getTime?.() ?? 0)}
            title="Add a keyframe at the playhead"
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-teal-400/40 text-teal-400 hover:bg-teal-400/10 transition-colors"
          >
            <Plus className="h-3 w-3" /> Key
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        className="relative h-8 rounded-md border border-border bg-secondary/40 cursor-pointer select-none overflow-hidden"
      >
        {/* keyframe ticks */}
        {keyTimes.map((t, i) => (
          <div
            key={i}
            className="absolute top-1 bottom-1 w-px bg-muted-foreground/40"
            style={{ left: `${pct(t)}%` }}
          />
        ))}

        {/* active edit time marker */}
        {activeTime != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-300/80"
            style={{ left: `${pct(activeTime)}%` }}
          />
        )}

        {/* live playhead */}
        <div
          ref={playheadRef}
          className="absolute top-0 bottom-0 w-px bg-teal-400 pointer-events-none"
          style={{ left: '0%' }}
        >
          <div className="absolute -top-px -left-[3px] w-[7px] h-[7px] rotate-45 bg-teal-400" />
        </div>
      </div>

      <div className="flex justify-between text-[9px] font-mono text-muted-foreground/60">
        <span>0</span>
        <span>{duration.toFixed(2)}s</span>
      </div>
    </div>
  );
}
