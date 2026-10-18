import { useEffect } from 'react';

/**
 * While `open`, Escape calls `onClose` — unless `blocked` (an export is
 * running, or a nested confirm dialog owns the key). One copy for every
 * dialog instead of the same five lines in each.
 */
export function useEscapeToClose(open, onClose, blocked = false) {
  useEffect(() => {
    if (!open || blocked) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, blocked, onClose]);
}
