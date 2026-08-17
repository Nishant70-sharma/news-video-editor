import { entranceAnimationStyle } from '../../utils/animation';

export default function TextLayerOverlay({ layer, canvasW, canvasH, fontScale = 1 }) {
  const x = (layer.xPct ?? 0.5) * canvasW;
  const y = (layer.yPct ?? 0.5) * canvasH;
  const fontSize = (layer.fontSize || 32) * fontScale;
  const opacity = layer.opacity ?? 1;

  // Position/rotation live on this outer element's `transform` — the entrance animation (which
  // may also animate `transform` for slide effects) goes on the inner element instead, so the
  // two don't fight over the same CSS property.
  return (
    <div
      className="absolute whitespace-nowrap"
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${layer.rotationDeg || 0}deg)`
      }}
    >
      <div
        key={`${layer.animation}-${layer.text}`}
        style={{
          fontSize,
          color: layer.color || '#ffffff',
          backgroundColor: layer.bgColor || 'transparent',
          opacity,
          padding: layer.bgColor ? `${6 * fontScale}px ${12 * fontScale}px` : 0,
          borderRadius: layer.bgColor ? 6 * fontScale : 0,
          textShadow: layer.shadow ? `${2 * fontScale}px ${2 * fontScale}px ${6 * fontScale}px rgba(0,0,0,0.6)` : 'none',
          WebkitTextStroke: layer.stroke ? `${fontScale}px #000000` : undefined,
          ...entranceAnimationStyle(layer.animation, opacity)
        }}
      >
        {layer.text}
      </div>
    </div>
  );
}
