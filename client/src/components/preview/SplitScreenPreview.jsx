import { useEffect, useRef, useState } from 'react';

/**
 * Visual approximation of the split-screen export: two clips stacked (Short) or side by side
 * (Long), plus the reserved text margin band and thin divider gap — mirrors
 * filterGraph.service.js's background+overlay compositing (margin position/amount, fixed gap).
 * When `alternate` is set, both boxes stay visible but only one clip plays at a time (the other
 * paused/frozen), handing off after Clip A's trimmed duration — approximating the export's
 * `tpad` freeze-and-swap behavior. Precise frame-accurate sync isn't implemented here — the
 * export is the source of truth.
 */
export default function SplitScreenPreview({
  splitClips,
  aspectRatio,
  marginPct = 0,
  marginPosition = 'bottom',
  alternate = false
}) {
  const vertical = aspectRatio === '9:16';
  // The margin band can sit on any of the 4 edges independent of the clip-stack direction —
  // e.g. a top/bottom split can still reserve its margin on the left or right edge. The outer
  // container's axis follows the margin's edge; the stack direction lives in a nested container.
  const marginOnHorizontalEdge = marginPosition === 'top' || marginPosition === 'bottom';
  const marginAtStart = marginPosition === 'top' || marginPosition === 'left';
  const [activeTurn, setActiveTurn] = useState(0);
  const videoRefA = useRef(null);
  const videoRefB = useRef(null);

  const durationA = splitClips[0].sourceVideo ? splitClips[0].trim.endSec - splitClips[0].trim.startSec : 0;

  useEffect(() => {
    if (!alternate) return undefined;
    setActiveTurn(0);
    videoRefA.current?.play().catch(() => {});
    videoRefB.current?.pause();
    if (!durationA) return undefined;
    const timer = setTimeout(() => {
      setActiveTurn(1);
      videoRefA.current?.pause();
      if (videoRefB.current) {
        videoRefB.current.currentTime = 0;
        videoRefB.current.play().catch(() => {});
      }
    }, durationA * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alternate, splitClips[0]?.sourceVideo?.id, splitClips[1]?.sourceVideo?.id, durationA]);

  const marginBand = marginPct > 0 && (
    <div
      className="flex shrink-0 items-center justify-center bg-black/70 text-[10px] text-slate-500"
      style={{ flexBasis: `${marginPct * 100}%` }}
    >
      Text margin
    </div>
  );
  const gap = <div className="shrink-0 bg-black" style={{ flexBasis: '0.8%' }} />;

  const clipEls = splitClips.map((clip, i) => (
    <div key={i} className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
      {clip.sourceVideo ? (
        <video
          ref={i === 0 ? videoRefA : videoRefB}
          src={clip.sourceVideo.url}
          className="h-full w-full object-cover"
          autoPlay={!alternate || i === 0}
          loop={!alternate}
          muted
          playsInline
        />
      ) : (
        <span className="text-xs text-slate-500">Clip {i === 0 ? 'A' : 'B'} — not uploaded</span>
      )}
      {alternate && clip.sourceVideo && (
        <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-slate-300">
          {activeTurn === i ? 'Playing' : 'Frozen'}
        </div>
      )}
    </div>
  ));

  const contentArea = (
    <div className={`flex min-h-0 min-w-0 flex-1 ${vertical ? 'flex-col' : 'flex-row'}`}>
      {clipEls[0]}
      {gap}
      {clipEls[1]}
    </div>
  );

  return (
    <div className={`flex h-full w-full ${marginOnHorizontalEdge ? 'flex-col' : 'flex-row'}`}>
      {marginAtStart && marginBand}
      {contentArea}
      {!marginAtStart && marginBand}
    </div>
  );
}
