import { useEffect, useRef } from 'react';

/**
 * Array version of useImageDataUrl: decodes a list of data-URLs into
 * HTMLImageElements, exposed as `ref.current` (same length as `urls`, with
 * null for anything that failed) so the render loop can index it per frame.
 * Pass a memoised array — the effect re-runs on identity change.
 */
export function useImageDataUrls(urls) {
  const ref    = useRef([]);
  const genRef = useRef(0);

  useEffect(() => {
    const myGen = ++genRef.current;
    const list  = urls ?? [];
    const imgs  = list.map(() => null);
    ref.current = imgs;
    const handles = list.map((url, i) => {
      if (!url) return null;
      const img = new Image();
      img.onload  = () => { if (myGen === genRef.current) imgs[i] = img;  };
      img.onerror = () => { if (myGen === genRef.current) imgs[i] = null; };
      img.src = url;
      return img;
    });
    return () => {
      for (const img of handles) {
        if (!img) continue;
        img.onload = img.onerror = null;
        img.src = '';
      }
    };
  }, [urls]);

  return ref;
}
