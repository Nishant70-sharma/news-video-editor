import { useEffect, useState } from 'react';

/**
 * Cycles the displayed image by elapsed time against each image's own durationSec — mirrors the
 * export's plain hard-cut concat (no crossfade/Ken Burns), so the preview matches what renders.
 */
export default function ImagesSlideshowPreview({ images }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (images.length < 2) return undefined;
    let raf;
    let cursor = 0;
    const start = performance.now();

    function tick(now) {
      const elapsed = (now - start) / 1000;
      let acc = 0;
      let i = 0;
      for (; i < images.length; i++) {
        acc += images[i].durationSec || 3;
        if (elapsed < acc) break;
      }
      const next = Math.min(i, images.length - 1);
      if (next !== cursor) {
        cursor = next;
        setIndex(next);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [images]);

  if (!images.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500">
        Add images to begin
      </div>
    );
  }

  return <img src={images[index].url} alt={`Slide ${index + 1}`} className="h-full w-full object-contain" />;
}
