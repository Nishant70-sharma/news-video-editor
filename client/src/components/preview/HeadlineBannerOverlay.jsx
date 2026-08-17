import { resolveBoxPx, headlineBannerBox } from '../../utils/overlayGeometry';
import { entranceAnimationStyle } from '../../utils/animation';

export default function HeadlineBannerOverlay({ headline, canvasW, canvasH, fontScale = 1 }) {
  if (!headline?.main && !headline?.sub) return null;
  const box = resolveBoxPx(headlineBannerBox(headline), canvasW, canvasH);
  const fontFamily = headline.fontFamily === 'alt' ? 'Bebas Neue' : 'Anton';
  const mainSize = (headline.fontSize || 40) * fontScale;
  const opacity = headline.opacity ?? 0.85;

  return (
    <div
      key={`${headline.animation}-${headline.main}-${headline.sub}`}
      className="absolute flex flex-col justify-center overflow-hidden"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        backgroundColor: headline.bgColor || '#c1121f',
        opacity,
        borderRadius: (headline.borderRadius ?? 8) * fontScale,
        padding: (headline.padding ?? 18) * fontScale,
        ...entranceAnimationStyle(headline.animation, opacity)
      }}
    >
      {headline.main && (
        <div
          className="uppercase leading-none text-white drop-shadow-md"
          style={{ fontFamily, fontSize: mainSize }}
        >
          {headline.main}
        </div>
      )}
      {headline.sub && (
        <div className="mt-1 text-slate-100" style={{ fontSize: Math.round(mainSize * 0.5) }}>
          {headline.sub}
        </div>
      )}
      {(headline.location || headline.reporter) && (
        <div className="mt-0.5 italic text-slate-200" style={{ fontSize: Math.round(mainSize * 0.4) }}>
          {[headline.location, headline.reporter].filter(Boolean).join('   |   ')}
        </div>
      )}
    </div>
  );
}
