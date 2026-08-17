import { resolveBoxPx } from '../../utils/overlayGeometry';

/**
 * Visual approximation of the PiP export: main video full-screen (rendered by the caller),
 * small clip corner-anchored on top, always muted — matches filterGraph.service.js's
 * cover-fit crop + corner overlay.
 */
export default function PipPreview({ pipClip, canvasW, canvasH }) {
  if (!pipClip?.sourceVideo || !canvasW) return null;
  const sizePct = pipClip.sizePct ?? 0.3;
  const marginPx = Math.round(canvasW * 0.03);
  const box = resolveBoxPx(
    { position: pipClip.position || 'bottom-right', widthPct: sizePct, heightPct: sizePct, marginPx },
    canvasW,
    canvasH
  );

  return (
    <div
      className="absolute overflow-hidden rounded-md border border-white/30 shadow-lg"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
    >
      <video src={pipClip.sourceVideo.url} className="h-full w-full object-cover" autoPlay loop muted playsInline />
    </div>
  );
}
