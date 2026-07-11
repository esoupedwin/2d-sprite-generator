import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { SectionTitle } from '@/components/ui/section-title.jsx';
import { ORDERABLE_LAYERS } from '../systems/Renderer.js';

const LABELS = Object.fromEntries(ORDERABLE_LAYERS.map(l => [l.key, l.label]));

/**
 * Per-animation layer (z-order) editor. `order` is the resolved back → front
 * draw order; the list is shown FRONT → BACK (top = on top, like a layers
 * panel). Moving a row up brings it closer to the front. `onChange` receives a
 * new back → front array; `onReset` clears the per-animation override.
 */
export function LayerOrderPanel({ order, onChange, onReset, isCustom, animationName }) {
  // Display front → back (reverse of the back → front draw order).
  const display = [...order].reverse();

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= display.length) return;
    const next = display.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange([...next].reverse()); // back to draw order
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionTitle>Layer order (z-index)</SectionTitle>
        {isCustom && (
          <button
            type="button"
            onClick={onReset}
            title="Reset to the default order for this animation"
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/70 leading-snug">
        Front is on top. Reorder how body parts stack for
        {' '}<span className="font-mono">{animationName}</span>.
      </p>

      <div className="flex flex-col gap-1 border border-border rounded-md p-1.5">
        {display.map((key, i) => (
          <div
            key={key}
            className="flex items-center gap-2 px-2 py-1 rounded bg-secondary/40 border border-border/60"
          >
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 w-4 tabular-nums">{i + 1}</span>
            <span className="flex-1 text-xs text-foreground">{LABELS[key] ?? key}</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="Move toward front"
                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-25 disabled:cursor-default transition-colors"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === display.length - 1}
                title="Move toward back"
                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-25 disabled:cursor-default transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] uppercase tracking-wider text-muted-foreground/50 px-1">
        <span>Top = front</span>
        <span>Bottom = back</span>
      </div>
    </div>
  );
}
