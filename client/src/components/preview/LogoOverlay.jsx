import { resolveBoxPx } from '../../utils/overlayGeometry';

export default function LogoOverlay({ logo, canvasW, canvasH }) {
  if (!logo?.assetUrl) return null;
  const isCircle = logo.shape === 'circle';
  const widthPct = logo.widthPct ?? 0.1;
  // Circle shape forces a square box (heightPct == widthPct in canvas-width terms) so bottom/
  // right anchors account for the image's actual footprint — matches the server's ffmpeg mask.
  const box = resolveBoxPx(
    {
      position: logo.position,
      xPct: logo.xPct,
      yPct: logo.yPct,
      widthPct,
      heightPct: isCircle ? (widthPct * canvasW) / canvasH : 0,
      marginPx: logo.marginPx ?? 24
    },
    canvasW,
    canvasH
  );

  if (isCircle) {
    return (
      <div
        className="absolute overflow-hidden rounded-full"
        style={{ left: box.x, top: box.y, width: box.width, height: box.width, opacity: logo.opacity ?? 1 }}
      >
        <img src={logo.assetUrl} alt="Logo" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <img
      src={logo.assetUrl}
      alt="Logo"
      className="absolute"
      style={{ left: box.x, top: box.y, width: box.width, opacity: logo.opacity ?? 1 }}
    />
  );
}
