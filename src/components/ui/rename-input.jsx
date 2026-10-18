import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Inline rename field: focuses and selects its text on mount, commits on
 * Enter or blur, cancels on Escape, and swallows clicks so the row it sits in
 * doesn't react. Pass `className` for the host's sizing/shape.
 */
export function RenameInput({ initialValue, onCommit, onCancel, className }) {
  const [value, setValue] = useState(initialValue ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={e => {
        if (e.key === 'Enter')       { e.preventDefault(); onCommit(value); }
        else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      className={cn('bg-secondary border border-primary text-foreground outline-none', className)}
    />
  );
}
