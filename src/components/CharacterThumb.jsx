import { useEffect, useState } from 'react';
import { buildCharacterThumbnail } from '../utils/export.js';
import { cn } from '@/lib/utils.js';

// Thumbnails are keyed by the character OBJECT: state updates are immutable, so
// an edited character is a new object and gets a fresh render, while untouched
// characters keep theirs for as long as they stay in state.
const cache = new WeakMap(); // character → Promise<dataUrl | null>
// One render at a time so opening a long list never stalls the UI.
let queue = Promise.resolve();

function thumbnailFor(character) {
  let p = cache.get(character);
  if (!p) {
    p = queue.then(() => buildCharacterThumbnail(character)).catch(() => null);
    queue = p;
    cache.set(character, p);
  }
  return p;
}

/** Small picture of a character in its default action's first frame. */
export function CharacterThumb({ character, className }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let live = true;
    thumbnailFor(character).then(u => { if (live) setUrl(u); });
    return () => { live = false; };
  }, [character]);

  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-black/25', className)}>
      {url && <img src={url} alt="" draggable={false} className="h-full w-full object-contain" />}
    </span>
  );
}
