import { resolveBoxPx } from '../../utils/overlayGeometry';

export default function DateTimeStampOverlay({ dateTimeStamp, canvasW, canvasH }) {
  if (!dateTimeStamp?.enabled) return null;
  const position = dateTimeStamp.position || 'top-right';
  const box = resolveBoxPx({ position, widthPct: 0.28, heightPct: 0.05, marginPx: 24 }, canvasW, canvasH);
  const text = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className="absolute flex items-center justify-center rounded-md bg-black/75 text-white"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height, fontSize: box.height * 0.4 }}
    >
      {text}
    </div>
  );
}
