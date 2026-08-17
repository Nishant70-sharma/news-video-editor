import { useEffect, useRef, useState } from 'react';
import { resolveBoxPx, watermarkTextBox } from '../../utils/overlayGeometry';

/**
 * Mirrors the FFmpeg export's drift-across scroll math exactly (see filterGraph.service.js):
 *   ltr: mod(t*speed, W+w) - w
 *   rtl: W - mod(t*speed, W+w)
 * with w == the strip's own width (the full canvas width, same as the export's rendered PNG),
 * so the watermark periodically crosses the middle rather than sitting fixed like the corner
 * image watermark. `bandColor` is the current template's accent color (headline.bgColor).
 */
export default function WatermarkTextOverlay({ watermark, bandColor, canvasW, canvasH, fontScale = 1 }) {
  const stripRef = useRef(null);
  const box = resolveBoxPx(watermarkTextBox(), canvasW, canvasH);

  useEffect(() => {
    if (!watermark?.text || !canvasW) return undefined;
    const speed = watermark.textSpeedPxPerSec || 90;
    const w = canvasW;
    let raf;
    const start = performance.now();

    function tick(now) {
      const t = (now - start) / 1000;
      const period = canvasW + w;
      const x = watermark.textDirection === 'rtl' ? canvasW - ((t * speed) % period) : ((t * speed) % period) - w;
      if (stripRef.current) stripRef.current.style.transform = `translateX(${x}px)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [watermark?.text, watermark?.textDirection, watermark?.textSpeedPxPerSec, canvasW]);

  if (!watermark?.text || !canvasW) return null;

  return (
    <div className="absolute overflow-hidden" style={{ left: 0, top: box.y, width: canvasW, height: box.height }}>
      <div
        ref={stripRef}
        className="absolute top-0 h-full whitespace-nowrap font-bold"
        style={{
          width: canvasW,
          backgroundColor: bandColor ? `${bandColor}47` : 'transparent',
          color: watermark.textColor || '#ffffff',
          opacity: watermark.opacity ?? 0.6
        }}
      >
        <span
          className="absolute left-6 top-1/2 -translate-y-1/2"
          style={{ fontSize: (watermark.fontSize || 36) * fontScale }}
        >
          {watermark.text}
        </span>
      </div>
    </div>
  );
}
