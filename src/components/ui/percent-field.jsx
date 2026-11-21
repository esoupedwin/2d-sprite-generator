import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Editable "xxx%" readout for a scale multiplier (1 = 100%). Shows the value
 * as a whole percent; typing replaces it, Enter or blur applies (clamped to
 * [min, max] and rounded to a whole percent), Esc cancels. Anything that
 * doesn't parse as a number is discarded. Used between the − / + steppers.
 */
export function PercentField({ value, min, max, onChange, className, title = 'Type a percentage' }) {
  const [draft, setDraft] = useState(null); // string while editing, null otherwise
  const shown = `${Math.round(value * 100)}%`;

  const commit = () => {
    if (draft == null) return;
    const n = parseFloat(draft.replace('%', ''));
    setDraft(null);
    if (!Number.isFinite(n)) return;
    const next = Math.min(max, Math.max(min, Math.round(n) / 100));
    if (Math.abs(next - value) > 1e-9) onChange(next);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? shown}
      title={title}
      aria-label={title}
      onFocus={(e) => { setDraft(String(Math.round(value * 100))); requestAnimationFrame(() => e.target.select()); }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        else if (e.key === 'Escape') { e.stopPropagation(); setDraft(null); requestAnimationFrame(() => e.target.blur()); }
      }}
      className={cn(
        'w-[44px] h-[22px] px-0.5 rounded-sm border border-transparent bg-transparent text-[11px] text-center font-mono outline-none',
        'hover:border-border focus:border-primary focus:bg-secondary transition-colors',
        className,
      )}
    />
  );
}
