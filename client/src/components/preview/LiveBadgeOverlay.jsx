import { resolveBoxPx } from '../../utils/overlayGeometry';

/** Hard on/off blink (not a smooth pulse) — matches the export's `enable` expression exactly. */
export default function LiveBadgeOverlay({ liveBadge, canvasW, canvasH }) {
  if (!liveBadge?.enabled) return null;
  const box = resolveBoxPx({ position: 'top-left', widthPct: 0.14, heightPct: 0.055, marginPx: 24 }, canvasW, canvasH);
  const dotSize = box.height * 0.48;

  return (
    <div
      className="absolute flex items-center gap-2 rounded-full bg-black/85 px-3"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
    >
      <span
        className="animate-live-blink shrink-0 rounded-full bg-red-500"
        style={{ width: dotSize, height: dotSize }}
      />
      <span className="font-bold text-white" style={{ fontSize: box.height * 0.5 }}>
        LIVE
      </span>
    </div>
  );
}
