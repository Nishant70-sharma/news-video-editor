import { resolveBoxPx, subscribeBarBox } from '../../utils/overlayGeometry';

export default function SubscribeBarOverlay({ subscribeBar, canvasW, canvasH }) {
  if (!subscribeBar?.enabled) return null;
  const box = resolveBoxPx(subscribeBarBox(), canvasW, canvasH);

  return (
    <div
      className="absolute flex items-center bg-red-700/90 px-3 font-bold text-white"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height, fontSize: box.height * 0.45 }}
    >
      {subscribeBar.text || 'Subscribe, Like & Share!'}
    </div>
  );
}
