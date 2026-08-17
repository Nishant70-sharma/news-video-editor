import { resolveBoxPx } from '../../utils/overlayGeometry';

export default function WatermarkOverlay({ watermark, canvasW, canvasH }) {
  if (!watermark?.assetUrl) return null;
  const isCircle = watermark.shape === 'circle';
  const widthPct = watermark.widthPct ?? 0.08;
  const box = resolveBoxPx(
    {
      position: watermark.position === 'custom' ? undefined : watermark.position,
      xPct: watermark.xPct,
      yPct: watermark.yPct,
      widthPct,
      heightPct: isCircle ? (widthPct * canvasW) / canvasH : 0,
      marginPx: 20
    },
    canvasW,
    canvasH
  );

  if (isCircle) {
    return (
      <div
        className="absolute overflow-hidden rounded-full"
        style={{ left: box.x, top: box.y, width: box.width, height: box.width, opacity: watermark.opacity ?? 0.6 }}
      >
        <img src={watermark.assetUrl} alt="Watermark" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <img
      src={watermark.assetUrl}
      alt="Watermark"
      className="absolute"
      style={{ left: box.x, top: box.y, width: box.width, opacity: watermark.opacity ?? 0.6 }}
    />
  );
}
