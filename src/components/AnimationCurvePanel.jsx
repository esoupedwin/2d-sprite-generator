import { SectionTitle } from '@/components/ui/section-title.jsx';

// Format a number for compact, readable display
function fmt(n) {
  if (n === undefined || n === null) return '';
  const abs = Math.abs(n);
  if (abs < 0.0005) return '0';
  return (n > 0 ? '+' : '') + n.toFixed(3).replace(/\.?0+$/, '');
}

function partsOf(kf) {
  const out = [];
  if (kf.x !== undefined)        out.push(`x ${fmt(kf.x)}`);
  if (kf.y !== undefined)        out.push(`y ${fmt(kf.y)}`);
  if (kf.rotation !== undefined) out.push(`rot ${fmt(kf.rotation)}`);
  return out.join('  ');
}

function offsetLine(off) {
  if (!off) return null;
  const out = [];
  if (off.x)        out.push(`x ${fmt(off.x)}`);
  if (off.y)        out.push(`y ${fmt(off.y)}`);
  if (off.rotation) out.push(`rot ${fmt(off.rotation)}`);
  return out.length ? out.join('  ') : null;
}

export function AnimationCurvePanel({
  animation, offsets, overrides,
  activeKeyframe, onKeyframeClick,
}) {
  if (!animation) {
    return (
      <div className="text-xs text-muted-foreground">No animation data.</div>
    );
  }

  const tracks = animation.tracks ?? {};
  const boneIds = Object.keys(tracks);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <SectionTitle>Animation Data</SectionTitle>
        <span className="text-[11px] text-muted-foreground font-mono">
          {animation.name} · {animation.duration?.toFixed?.(2) ?? animation.duration}s · {animation.loop ? 'loop' : 'once'}
        </span>
      </div>

      <div className="text-xs text-muted-foreground/70 leading-snug">
        Click a <span className="font-mono">t=…</span> row to pause the animation at that
        time. Drag joints to retune that keyframe via ragdoll — the value is
        written to a per-character keyframe override.
      </div>

      <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1 border-t border-border pt-2 font-mono">
        {boneIds.length === 0 && (
          <div className="text-xs text-muted-foreground">No tracks.</div>
        )}
        {boneIds.map(boneId => {
          const kfs = tracks[boneId] ?? [];
          const off = offsetLine(offsets?.[boneId]);
          const boneOv = overrides?.[boneId] ?? null;
          return (
            <div key={boneId} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">{boneId}</span>
                {off && (
                  <span className="text-teal-400 text-[11px]" title="Edit Pose offset">
                    Δ {off}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-px pl-2 text-[11px]">
                {kfs.map((kf, i) => {
                  const key = kf.time.toFixed(2);
                  const isActive  = activeKeyframe && activeKeyframe.boneId === boneId && activeKeyframe.time.toFixed(2) === key;
                  const overridden = boneOv && boneOv[key];
                  const cls = isActive
                    ? 'text-yellow-300 bg-yellow-300/10'
                    : overridden
                      ? 'text-amber-300 hover:bg-secondary'
                      : 'text-muted-foreground hover:bg-secondary';
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onKeyframeClick?.(boneId, kf.time)}
                      className={`flex gap-2 text-left px-1 -mx-1 rounded transition-colors ${cls}`}
                      title={overridden ? 'Overridden — click to edit' : 'Click to edit at this time'}
                    >
                      <span className="opacity-70 w-10">t={key}</span>
                      <span>{partsOf(kf) || '—'}</span>
                      {overridden && <span className="ml-auto opacity-70">·edited</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
