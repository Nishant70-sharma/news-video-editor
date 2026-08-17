import { useEffect, useRef, useState } from 'react';
import { resolveBoxPx, tickerBox } from '../../utils/overlayGeometry';
import { entranceAnimationStyle } from '../../utils/animation';

/**
 * Mirrors the FFmpeg export's scroll math exactly (see filterGraph.service.js):
 *   ltr: mod(t*speed, W+w) - w
 *   rtl: W - mod(t*speed, W+w)
 * so the preview's motion is the same formula, not just a visually-similar CSS animation.
 */
export default function TickerOverlay({ ticker, canvasW, canvasH, fontScale = 1 }) {
  const textRef = useRef(null);
  const [textWidth, setTextWidth] = useState(0);
  const box = resolveBoxPx(tickerBox(), canvasW, canvasH);

  useEffect(() => {
    if (textRef.current) setTextWidth(textRef.current.offsetWidth);
  }, [ticker.text, ticker.fontSize, fontScale, canvasW]);

  useEffect(() => {
    if (!ticker.text) return undefined;
    const speed = ticker.speedPxPerSec || 120;
    const span = textRef.current;
    let raf;
    const start = performance.now();

    function tick(now) {
      const t = (now - start) / 1000;
      const period = canvasW + textWidth || 1;
      const x = ticker.direction === 'ltr' ? ((t * speed) % period) - textWidth : canvasW - ((t * speed) % period);
      if (span) span.style.transform = `translateY(-50%) translateX(${x}px)`;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ticker.text, ticker.direction, ticker.speedPxPerSec, canvasW, textWidth]);

  if (!ticker?.text) return null;

  return (
    <div
      key={`${ticker.animation}-${ticker.text}`}
      className="absolute overflow-hidden"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        backgroundColor: ticker.bgColor || '#111111',
        opacity: 0.9,
        ...entranceAnimationStyle(ticker.animation, 0.9)
      }}
    >
      <span
        ref={textRef}
        className="absolute top-1/2 whitespace-nowrap font-bold"
        style={{
          color: ticker.textColor || '#ffffff',
          fontSize: (ticker.fontSize || 28) * fontScale
        }}
      >
        {ticker.text}
      </span>
    </div>
  );
}
