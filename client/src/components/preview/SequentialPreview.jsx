import { useEffect, useRef, useState } from 'react';

/**
 * Shows Clip A, then switches to Clip B once Clip A's trimmed duration has elapsed — mirrors
 * the export's concat (Clip A plays fully, then Clip B), not a true frame-accurate handoff.
 */
export default function SequentialPreview({ splitClips }) {
  const [active, setActive] = useState(0);
  // Programmatic play() without a direct user gesture (this fires from a useEffect / setTimeout,
  // not a click handler) gets rejected by the browser when unmuted, so playback starts muted and
  // only unmutes once the viewer explicitly taps for sound.
  const [soundOn, setSoundOn] = useState(false);
  const videoARef = useRef(null);
  const videoBRef = useRef(null);

  const durA = splitClips[0].sourceVideo ? splitClips[0].trim.endSec - splitClips[0].trim.startSec : 0;

  useEffect(() => {
    setActive(0);
    if (videoARef.current) {
      videoARef.current.currentTime = 0;
      videoARef.current.play().catch(() => {});
    }
    if (!durA) return undefined;
    const timer = setTimeout(() => {
      setActive(1);
      videoARef.current?.pause();
      if (videoBRef.current) {
        videoBRef.current.currentTime = 0;
        videoBRef.current.play().catch(() => {});
      }
    }, durA * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitClips[0]?.sourceVideo?.id, splitClips[1]?.sourceVideo?.id, durA]);

  if (!splitClips[0].sourceVideo && !splitClips[1].sourceVideo) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500">
        Upload both clips to begin
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black">
      {splitClips[0].sourceVideo && (
        <video
          ref={videoARef}
          src={splitClips[0].sourceVideo.url}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ visibility: active === 0 ? 'visible' : 'hidden' }}
          muted={!soundOn}
          controls
          playsInline
        />
      )}
      {splitClips[1].sourceVideo && (
        <video
          ref={videoBRef}
          src={splitClips[1].sourceVideo.url}
          className="absolute inset-0 h-full w-full object-contain"
          style={{ visibility: active === 1 ? 'visible' : 'hidden' }}
          muted={!soundOn}
          controls
          playsInline
        />
      )}
      <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[10px] text-slate-300">
        Now playing: Clip {active === 0 ? 'A' : 'B'}
      </div>
      <button
        type="button"
        onClick={() => setSoundOn((v) => !v)}
        className="absolute left-1 top-1 z-10 rounded bg-black/70 px-2 py-1 text-[10px] text-slate-200 hover:bg-black/90"
      >
        {soundOn ? '🔊 Sound on' : '🔇 Tap for sound'}
      </button>
    </div>
  );
}
