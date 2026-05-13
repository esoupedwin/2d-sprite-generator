import { useEffect, useRef } from 'react';

/**
 * Decodes a data-URL string into an HTMLImageElement and exposes it via a
 * ref so the render loop can read `ref.current` synchronously each frame.
 *
 * A monotonic generation counter prevents a stale in-flight image from a
 * previous URL clobbering the ref after a newer URL has been requested
 * (the rapid-weapon-swap race the previous useEffect implementations had).
 */
export function useImageDataUrl(url) {
  const ref    = useRef(null);
  const genRef = useRef(0);

  useEffect(() => {
    if (!url) { ref.current = null; return; }
    const myGen = ++genRef.current;
    const img   = new Image();
    img.onload  = () => { if (myGen === genRef.current) ref.current = img;   };
    img.onerror = () => { if (myGen === genRef.current) ref.current = null;  };
    img.src = url;
    return () => {
      // Detach so an in-flight load that resolves after unmount/replacement
      // can't write back to a no-longer-relevant ref slot.
      img.onload = img.onerror = null;
      img.src = '';
    };
  }, [url]);

  return ref;
}
