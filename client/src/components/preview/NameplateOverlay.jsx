import { resolveBoxPx, nameplateBox } from '../../utils/overlayGeometry';
import { entranceAnimationStyle } from '../../utils/animation';

/**
 * The export auto-hides this after `durationSec` seconds (0 = whole video) via an FFmpeg
 * `enable` expression — the preview shows it persistently instead of syncing to video
 * playback time, which is fine for editing purposes (positioning/text/color), just not a
 * frame-accurate preview of the auto-hide timing itself.
 */
export default function NameplateOverlay({ nameplate, templateBgColor, canvasW, canvasH, fontScale = 1 }) {
  if (!nameplate?.enabled || (!nameplate.name && !nameplate.title)) return null;
  const box = resolveBoxPx(nameplateBox(nameplate), canvasW, canvasH);
  const bgColor = nameplate.bgColor || templateBgColor || '#1e3a8a';
  const nameSize = box.height * 0.34;
  const titleSize = box.height * 0.24;

  return (
    <div
      key={`${nameplate.animation}-${nameplate.name}-${nameplate.title}`}
      className="absolute flex flex-col justify-center overflow-hidden rounded-md"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        backgroundColor: bgColor,
        opacity: 0.92,
        paddingLeft: box.width * 0.06,
        borderLeft: `${box.width * 0.02}px solid rgba(255,255,255,0.85)`,
        ...entranceAnimationStyle(nameplate.animation, 0.92)
      }}
    >
      {nameplate.name && (
        <div className="font-bold leading-tight text-white" style={{ fontSize: nameSize * fontScale }}>
          {nameplate.name}
        </div>
      )}
      {nameplate.title && (
        <div className="leading-tight text-slate-200" style={{ fontSize: titleSize * fontScale }}>
          {nameplate.title}
        </div>
      )}
    </div>
  );
}
